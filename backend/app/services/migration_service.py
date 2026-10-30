import csv
import io
import re
import uuid
import datetime
from typing import List, Dict, Any, Optional, Tuple
import openpyxl

from app.schemas.phase7 import (
    ColumnMappingItem,
    MigrationBatchSummary,
    MigrationBatchDetail,
    MigrationRowItem,
)

# Standard target fields
TARGET_FIELDS = [
    'institution_name',
    'bank_name',
    'branch_name',
    'fdr_number',
    'amount',
    'currency',
    'issue_date',
    'maturity_date',
    'interest_rate',
    'lien_in_favour',
    'remarks'
]

# Field synonyms for automatic smart mapping suggestions
FIELD_SYNONYMS: Dict[str, List[str]] = {
    'fdr_number': ['fdr number', 'fdr no', 'fdr_no', 'certificate no', 'cert no', 'deposit no', 'receipt no', 'fdr'],
    'amount': ['amount', 'deposit amount', 'principal', 'value', 'sum', 'fdr amount', 'balance'],
    'currency': ['currency', 'curr'],
    'institution_name': ['institution', 'institution name', 'college', 'college name', 'university', 'inst name'],
    'bank_name': ['bank', 'bank name', 'depository bank', 'banker'],
    'branch_name': ['branch', 'branch name', 'bank branch', 'location'],
    'issue_date': ['issue date', 'date of issue', 'start date', 'booking date', 'effective date'],
    'maturity_date': ['maturity date', 'date of maturity', 'expiry date', 'due date', 'end date'],
    'interest_rate': ['interest rate', 'rate', 'roi', 'interest %', 'interest'],
    'lien_in_favour': ['lien in favour', 'lien in favor', 'lien', 'pledged to', 'in favour of', 'in favor of'],
    'remarks': ['remarks', 'notes', 'comments', 'description']
}

class MigrationService:
    def __init__(self):
        # In-memory stores for offline / development resilience
        self.batches: Dict[str, Dict[str, Any]] = {}
        self.rows: Dict[str, List[Dict[str, Any]]] = {} # batch_id -> list of rows
        self.mappings: Dict[str, List[ColumnMappingItem]] = {} # batch_id -> mappings
        self.profiles: Dict[str, Dict[str, Any]] = {
            'profile-001': {
                'id': 'profile-001',
                'profile_name': 'Standard AICTE Legacy Deposit Template',
                'institution_id': None,
                'column_mapping': {
                    'Institution Name': 'institution_name',
                    'Bank Name': 'bank_name',
                    'Branch': 'branch_name',
                    'FDR No': 'fdr_number',
                    'Deposit Amount': 'amount',
                    'Currency': 'currency',
                    'Date of Issue': 'issue_date',
                    'Date of Maturity': 'maturity_date',
                    'Interest Rate': 'interest_rate',
                    'Lien In Favour': 'lien_in_favour',
                    'Remarks': 'remarks'
                },
                'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
        }
        self.raw_files: Dict[str, bytes] = {}

    def suggest_mappings(self, headers: List[str]) -> List[ColumnMappingItem]:
        """Auto-suggest mappings based on header name similarity"""
        suggestions: List[ColumnMappingItem] = []
        used_targets = set()

        for header in headers:
            norm_header = header.lower().strip()
            matched_target = None
            for target, syns in FIELD_SYNONYMS.items():
                if target in used_targets:
                    continue
                if norm_header == target or norm_header in syns:
                    matched_target = target
                    break
                # Partial contains check
                for s in syns:
                    if s in norm_header:
                        matched_target = target
                        break
                if matched_target:
                    break

            if matched_target:
                suggestions.append(ColumnMappingItem(source_column=header, target_field=matched_target))
                used_targets.add(matched_target)
        return suggestions

    def parse_file(self, filename: str, content: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
        """Parses CSV or XLSX content safely without formula evaluation or macro execution"""
        filename_lower = filename.lower()
        headers: List[str] = []
        raw_rows: List[Dict[str, Any]] = []

        if filename_lower.endswith('.csv'):
            try:
                text = content.decode('utf-8')
            except UnicodeDecodeError:
                text = content.decode('latin-1')
            reader = csv.reader(io.StringIO(text))
            rows_list = list(reader)
            if not rows_list:
                raise ValueError("Spreadsheet file is completely empty.")
            headers = [h.strip() for h in rows_list[0] if h.strip()]
            for row in rows_list[1:]:
                if not any(cell.strip() for cell in row):
                    continue
                row_dict = {}
                for idx, cell in enumerate(row):
                    if idx < len(headers):
                        row_dict[headers[idx]] = cell.strip()
                raw_rows.append(row_dict)

        elif filename_lower.endswith(('.xlsx', '.xls')):
            wb = openpyxl.load_workbook(filename=io.BytesIO(content), data_only=True, read_only=True)
            sheet = wb.active
            rows_iter = sheet.iter_rows(values_only=True)
            first_row = next(rows_iter, None)
            if not first_row:
                raise ValueError("Spreadsheet workbook contains no rows.")
            headers = [str(cell).strip() for cell in first_row if cell is not None and str(cell).strip()]
            for row_vals in rows_iter:
                if not any(v is not None and str(v).strip() for v in row_vals):
                    continue
                row_dict = {}
                for idx, cell_val in enumerate(row_vals):
                    if idx < len(headers):
                        val_str = "" if cell_val is None else str(cell_val).strip()
                        # Date formatting if openpyxl returned datetime
                        if isinstance(cell_val, (datetime.date, datetime.datetime)):
                            val_str = cell_val.strftime('%Y-%m-%d')
                        row_dict[headers[idx]] = val_str
                raw_rows.append(row_dict)
        else:
            raise ValueError("Unsupported file format. Please upload .csv or .xlsx spreadsheets.")

        if not headers:
            raise ValueError("No valid headers found in spreadsheet.")
        if len(raw_rows) > 5000:
            raise ValueError(f"Spreadsheet exceeds statutory batch maximum of 5,000 rows (got {len(raw_rows)}).")

        return headers, raw_rows

    def create_batch(
        self,
        filename: str,
        content: bytes,
        institution_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a new migration batch and stages rows for column mapping"""
        headers, raw_rows = self.parse_file(filename, content)

        batch_id = f"batch-{uuid.uuid4().hex[:8]}"
        file_type = "csv" if filename.lower().endswith(".csv") else "xlsx"

        batch = {
            'id': batch_id,
            'institution_id': institution_id,
            'institution_name': None,
            'uploaded_by': user_id,
            'file_name': filename,
            'storage_path': f"migrations/{batch_id}/{filename}",
            'file_type': file_type,
            'batch_status': 'uploaded',
            'total_rows': len(raw_rows),
            'valid_rows': 0,
            'invalid_rows': 0,
            'imported_rows': 0,
            'skipped_rows': 0,
            'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'completed_at': None,
            'headers': headers,
            'preview_data': raw_rows[:10]
        }

        # Initialize raw rows
        row_items: List[Dict[str, Any]] = []
        for idx, r_data in enumerate(raw_rows, start=1):
            row_items.append({
                'id': f"row-{batch_id}-{idx}",
                'batch_id': batch_id,
                'row_number': idx,
                'source_data': r_data,
                'normalized_data': {},
                'validation_status': 'pending',
                'validation_errors': [],
                'duplicate_candidates': [],
                'matched_institution_id': institution_id,
                'matched_institution_name': None,
                'matched_bank_id': None,
                'matched_bank_name': None,
                'matched_branch_id': None,
                'matched_branch_name': None,
                'reviewed_by': None,
                'review_note': None,
                'imported_fdr_id': None,
            })

        self.batches[batch_id] = batch
        self.rows[batch_id] = row_items
        self.raw_files[batch_id] = content

        # Auto suggest initial mappings
        suggested = self.suggest_mappings(headers)
        self.mappings[batch_id] = suggested

        return batch

    def set_mappings(
        self,
        batch_id: str,
        mappings: List[ColumnMappingItem],
        save_as_profile: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> List[ColumnMappingItem]:
        """Applies column mappings to batch and optionally saves as a reusable profile"""
        if batch_id not in self.batches:
            raise KeyError(f"Migration batch {batch_id} not found.")

        self.mappings[batch_id] = mappings
        self.batches[batch_id]['batch_status'] = 'mapping'

        if save_as_profile:
            prof_id = f"profile-{uuid.uuid4().hex[:8]}"
            mapping_dict = {m.source_column: m.target_field for m in mappings}
            self.profiles[prof_id] = {
                'id': prof_id,
                'profile_name': save_as_profile,
                'institution_id': self.batches[batch_id].get('institution_id'),
                'column_mapping': mapping_dict,
                'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat()
            }

        return mappings

    def _normalize_date(self, val: Any) -> Optional[str]:
        if not val:
            return None
        val_str = str(val).strip()
        # ISO format YYYY-MM-DD
        if re.match(r'^\d{4}-\d{2}-\d{2}$', val_str):
            return val_str
        # DD/MM/YYYY or DD-MM-YYYY
        m = re.match(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$', val_str)
        if m:
            d, mth, y = m.groups()
            return f"{y}-{int(mth):02d}-{int(d):02d}"
        return val_str

    def validate_batch(
        self,
        batch_id: str,
        existing_fdrs: List[Dict[str, Any]],
        existing_banks: List[Dict[str, Any]],
        existing_institutions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validates and normalizes all rows in a batch, checking constraints and duplicate FDRs"""
        if batch_id not in self.batches:
            raise KeyError(f"Migration batch {batch_id} not found.")

        batch = self.batches[batch_id]
        mappings = self.mappings.get(batch_id, [])
        if not mappings:
            raise ValueError("No column mappings defined for this batch.")

        # Mapping dictionary
        source_to_target = {m.source_column: m.target_field for m in mappings}

        rows = self.rows.get(batch_id, [])
        valid_count = 0
        invalid_count = 0

        # Existing FDR numbers set for fast duplicate detection
        existing_fdr_nums = {str(f.get('fdr_number', '')).strip().upper(): f for f in existing_fdrs}

        for row in rows:
            src = row['source_data']
            norm: Dict[str, Any] = {}
            for src_col, target_field in source_to_target.items():
                if src_col in src and src[src_col]:
                    norm[target_field] = src[src_col]

            errors: List[Dict[str, Any]] = []
            duplicates: List[Dict[str, Any]] = []

            # 1. Validate FDR Number
            fdr_num = norm.get('fdr_number', '').strip()
            if not fdr_num:
                errors.append({'field': 'fdr_number', 'message': 'FDR number is required.'})
            else:
                norm['fdr_number'] = fdr_num
                # Duplicate check against existing FDRs
                if fdr_num.upper() in existing_fdr_nums:
                    matched_fdr = existing_fdr_nums[fdr_num.upper()]
                    errors.append({'field': 'fdr_number', 'message': f"FDR number {fdr_num} already exists in Central Vault."})
                    duplicates.append({
                        'fdr_id': matched_fdr.get('id'),
                        'fdr_number': fdr_num,
                        'reason': 'Exact FDR number match',
                        'is_exact': True
                    })

            # 2. Validate Amount
            amount_val = norm.get('amount')
            if amount_val is None or str(amount_val).strip() == "":
                errors.append({'field': 'amount', 'message': 'Deposit amount is required.'})
            else:
                try:
                    amt_str = str(amount_val).strip()
                    is_neg = amt_str.startswith('-')
                    cleaned_amt = re.sub(r'[^\d.]', '', amt_str)
                    if not cleaned_amt:
                        errors.append({'field': 'amount', 'message': f"Invalid numeric amount '{amount_val}'."})
                    else:
                        amt_float = -float(cleaned_amt) if is_neg else float(cleaned_amt)
                        if amt_float <= 0:
                            errors.append({'field': 'amount', 'message': 'Deposit amount must be strictly greater than zero.'})
                        else:
                            norm['amount'] = amt_float
                except ValueError:
                    errors.append({'field': 'amount', 'message': f"Invalid numeric amount '{amount_val}'."})

            # Currency default
            if not norm.get('currency'):
                norm['currency'] = 'INR'

            # 3. Validate Dates
            issue_date_raw = norm.get('issue_date')
            norm_issue = self._normalize_date(issue_date_raw)
            if not norm_issue:
                errors.append({'field': 'issue_date', 'message': 'Issue date is required.'})
            else:
                norm['issue_date'] = norm_issue

            maturity_date_raw = norm.get('maturity_date')
            norm_maturity = self._normalize_date(maturity_date_raw)
            if not norm_maturity:
                errors.append({'field': 'maturity_date', 'message': 'Maturity date is required.'})
            else:
                norm['maturity_date'] = norm_maturity

            if norm_issue and norm_maturity:
                try:
                    dt_issue = datetime.date.fromisoformat(norm_issue)
                    dt_mat = datetime.date.fromisoformat(norm_maturity)
                    if dt_mat <= dt_issue:
                        errors.append({
                            'field': 'maturity_date',
                            'message': f"Maturity date ({norm_maturity}) must be after issue date ({norm_issue})."
                        })
                except ValueError:
                    errors.append({'field': 'dates', 'message': 'Invalid date format (must be YYYY-MM-DD or DD/MM/YYYY).'})

            # 4. Interest Rate (Optional)
            ir_val = norm.get('interest_rate')
            if ir_val is not None and str(ir_val).strip() != "":
                try:
                    ir_str = str(ir_val).strip()
                    is_neg_ir = ir_str.startswith('-')
                    cleaned_ir = re.sub(r'[^\d.]', '', ir_str)
                    if not cleaned_ir:
                        errors.append({'field': 'interest_rate', 'message': f"Invalid numeric interest rate '{ir_val}'."})
                    else:
                        ir_float = -float(cleaned_ir) if is_neg_ir else float(cleaned_ir)
                        if ir_float < 0 or ir_float > 100:
                            errors.append({'field': 'interest_rate', 'message': 'Interest rate must be between 0% and 100%.'})
                        else:
                            norm['interest_rate'] = ir_float
                except ValueError:
                    errors.append({'field': 'interest_rate', 'message': f"Invalid numeric interest rate '{ir_val}'."})

            # 5. Entity Matching (Bank & Institution)
            bank_name = norm.get('bank_name', '').strip()
            if bank_name:
                for b in existing_banks:
                    if b['name'].lower() in bank_name.lower() or bank_name.lower() in b['name'].lower():
                        row['matched_bank_id'] = b['id']
                        row['matched_bank_name'] = b['name']
                        break
            if not row['matched_bank_id'] and existing_banks:
                row['matched_bank_id'] = existing_banks[0]['id']
                row['matched_bank_name'] = existing_banks[0]['name']

            inst_name = norm.get('institution_name', '').strip()
            if inst_name:
                for inst in existing_institutions:
                    if inst['name'].lower() in inst_name.lower() or inst_name.lower() in inst['name'].lower():
                        row['matched_institution_id'] = inst['id']
                        row['matched_institution_name'] = inst['name']
                        break
            if not row['matched_institution_id'] and existing_institutions:
                row['matched_institution_id'] = existing_institutions[0]['id']
                row['matched_institution_name'] = existing_institutions[0]['name']

            # Check for possible duplicate (fuzzy candidate: same bank & amount & maturity)
            if 'amount' in norm and 'maturity_date' in norm:
                for ex_f in existing_fdrs:
                    if (
                        str(ex_f.get('fdr_number')) != str(fdr_num) and
                        str(ex_f.get('maturity_date', '')) == str(norm.get('maturity_date', '')) and
                        abs(float(ex_f.get('amount', 0)) - float(norm.get('amount', 0))) < 1.0
                    ):
                        duplicates.append({
                            'fdr_id': ex_f.get('id'),
                            'fdr_number': ex_f.get('fdr_number'),
                            'reason': 'Similar amount and matching maturity date',
                            'is_exact': False
                        })

            row['normalized_data'] = norm
            row['validation_errors'] = errors
            row['duplicate_candidates'] = duplicates

            if any(d.get('is_exact') for d in duplicates):
                row['validation_status'] = 'duplicate_exact'
                invalid_count += 1
            elif errors:
                row['validation_status'] = 'invalid'
                invalid_count += 1
            elif any(not d.get('is_exact') for d in duplicates):
                row['validation_status'] = 'duplicate_fuzzy'
                valid_count += 1
            else:
                row['validation_status'] = 'valid'
                valid_count += 1

        batch['valid_rows'] = valid_count
        batch['invalid_rows'] = invalid_count
        batch['batch_status'] = 'review_required' if (invalid_count > 0 or any(r['duplicate_candidates'] for r in rows)) else 'ready'

        return {
            'batch_id': batch_id,
            'total_rows': batch['total_rows'],
            'valid_rows': valid_count,
            'invalid_rows': invalid_count,
            'status': batch['batch_status']
        }

    def review_row(
        self,
        batch_id: str,
        row_id: str,
        action: str,
        corrected_data: Optional[Dict[str, Any]] = None,
        review_note: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Allows authorized officers to exclude or correct a row"""
        rows = self.rows.get(batch_id, [])
        target_row = next((r for r in rows if r['id'] == row_id), None)
        if not target_row:
            raise KeyError(f"Row {row_id} not found in batch {batch_id}.")

        target_row['reviewed_by'] = user_id
        target_row['review_note'] = review_note

        if action == 'exclude':
            target_row['validation_status'] = 'excluded'
        elif action == 'approve':
            target_row['validation_status'] = 'reviewed'
        elif action == 'correct' and corrected_data:
            target_row['normalized_data'].update(corrected_data)
            target_row['validation_status'] = 'reviewed'
            target_row['validation_errors'] = []

        # Recalculate batch counts
        batch = self.batches.get(batch_id)
        if batch:
            val_count = sum(1 for r in rows if r['validation_status'] in ('valid', 'reviewed', 'duplicate_fuzzy'))
            inv_count = sum(1 for r in rows if r['validation_status'] in ('invalid', 'duplicate_exact'))
            batch['valid_rows'] = val_count
            batch['invalid_rows'] = inv_count

        return target_row

    def execute_import(
        self,
        batch_id: str,
        create_fdr_callback: Any,
        user_id: Optional[str] = None,
        skip_fuzzy: bool = True
    ) -> Dict[str, Any]:
        """Idempotently creates Tier 1 FDR records for eligible rows"""
        if batch_id not in self.batches:
            raise KeyError(f"Migration batch {batch_id} not found.")

        batch = self.batches[batch_id]
        if batch['batch_status'] == 'completed':
            return {
                'batch_id': batch_id,
                'status': 'already_completed',
                'imported_count': batch['imported_rows'],
                'skipped_count': batch['skipped_rows']
            }

        rows = self.rows.get(batch_id, [])
        imported = 0
        skipped = 0

        for row in rows:
            # Skip if already imported or excluded
            if row['validation_status'] in ('imported', 'excluded', 'invalid', 'duplicate_exact'):
                skipped += 1
                continue

            if row['validation_status'] == 'duplicate_fuzzy' and skip_fuzzy:
                skipped += 1
                continue

            # Eligible rows: 'valid' or 'reviewed'
            norm = row['normalized_data']
            try:
                # STRICT GOVERNANCE INVARIANT:
                # All legacy migrated FDRs must initialize strictly at Tier 1, Pending, Institution Declared
                new_fdr = create_fdr_callback({
                    'fdr_number': norm['fdr_number'],
                    'institution_id': row.get('matched_institution_id') or batch.get('institution_id'),
                    'bank_id': row.get('matched_bank_id'),
                    'branch_id': row.get('matched_branch_id'),
                    'amount': norm['amount'],
                    'currency': norm.get('currency', 'INR'),
                    'interest_rate': norm.get('interest_rate', 6.5),
                    'issue_date': norm['issue_date'],
                    'maturity_date': norm['maturity_date'],
                    'lien_in_favour': norm.get('lien_in_favour', 'All India Council for Technical Education (AICTE)'),
                    'remarks': f"Legacy Migration Import ({batch.get('file_name')}): {norm.get('remarks', '')}".strip(),
                    'trust_tier': 1,
                    'verification_status': 'institution_declared',
                    'lifecycle_status': 'pending',
                    'heartbeat_status': 'not_started',
                    'created_by': user_id
                })

                row['imported_fdr_id'] = new_fdr.get('id') if isinstance(new_fdr, dict) else getattr(new_fdr, 'id', None)
                row['validation_status'] = 'imported'
                imported += 1
            except Exception as e:
                row['validation_status'] = 'failed'
                row['validation_errors'] = [{'field': 'import', 'message': str(e)}]
                skipped += 1

        batch['imported_rows'] = imported
        batch['skipped_rows'] = skipped
        batch['batch_status'] = 'completed'
        batch['completed_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        return {
            'batch_id': batch_id,
            'status': 'completed',
            'imported_count': imported,
            'skipped_count': skipped
        }

migration_service = MigrationService()
