import hashlib
import uuid
import datetime
import io
from typing import List, Dict, Any, Optional

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

from app.schemas.phase7 import (
    ComplianceTemplateCreate,
    ComplianceTemplateUpdate,
    ComplianceDocumentGenerateRequest,
    ComplianceDocumentDraftUpdate,
    ComplianceDocumentReviewRequest,
    MockSignRequest,
    MockSignResponse,
)

# Standard initial templates
INITIAL_TEMPLATES = [
    {
        'id': 'template-001',
        'template_name': 'FDR Details Confirmation Letter',
        'template_type': 'fdr_confirmation',
        'description': 'Official regulatory confirmation of security deposit fixed deposit details on AICTE record.',
        'template_content': """REF: AICTE/FDR/CONF/{{fdr_number}}
Date: {{current_date}}

To,
The Registrar / Principal,
{{institution_name}}

Subject: Formal Confirmation of Fixed Deposit Receipt Standing for {{institution_name}}

Sir / Madam,

This is to certify that Fixed Deposit Receipt (FDR) bearing Certificate No. {{fdr_number}}, in the principal sum of ₹{{amount}} (INR), issued by {{bank_name}} ({{branch_name}}), with maturity date {{maturity_date}}, is duly registered in the Central AICTE FDR-Chain Repository.

Statutory Lien Standing:
The deposit remains validly pledged and encumbered in favour of {{lien_in_favour}} as regulatory security deposit pursuant to Approval Process Handbook provisions.

Authorized Signatory,
All India Council for Technical Education (AICTE)""",
        'version': 1,
        'is_active': True,
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
    },
    {
        'id': 'template-002',
        'template_name': 'Bank Verification Request Letter',
        'template_type': 'bank_verification_request',
        'description': 'Formal requisition to depository commercial bank branch for statutory lien verification.',
        'template_content': """REF: AICTE/BANK/VERIFY/{{fdr_number}}
Date: {{current_date}}

To,
The Branch Manager,
{{bank_name}}, {{branch_name}}

Subject: Mandatory Digital & Ledger Verification of Pledged Security Deposit FDR {{fdr_number}}

Dear Branch Manager,

The institution {{institution_name}} has declared Fixed Deposit Receipt No. {{fdr_number}} in the amount of ₹{{amount}} pledged to {{lien_in_favour}}.

Pursuant to RBI Master Directions on Government Collateral Pledges, you are requested to verify the deposit standing on your branch CBS ledger and complete digital attestation on the FDR-Chain National Trust Network.

Kindly confirm that no premature encashment, loan, or third-party lien has been marked without explicit regulatory NOC.

Yours faithfully,
Regional Regulatory Officer, AICTE""",
        'version': 1,
        'is_active': True,
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
    },
    {
        'id': 'template-003',
        'template_name': 'FDR Renewal Reminder Letter',
        'template_type': 'renewal_reminder',
        'description': 'Advance regulatory reminder for approaching deposit maturity and rollover requirements.',
        'template_content': """REF: AICTE/RENEWAL/REM/{{fdr_number}}
Date: {{current_date}}

To,
The Head of Institution,
{{institution_name}}

Subject: Urgent Notice: Approaching Maturity of Security Deposit FDR {{fdr_number}}

Sir / Madam,

Our surveillance monitoring system indicates that Fixed Deposit Receipt No. {{fdr_number}} for ₹{{amount}} is scheduled to mature on {{maturity_date}}.

You are required to initiate deposit renewal or replacement procedures immediately through the FDR-Chain Renewal Desk to prevent regulatory forfeiture or default notice under AICTE Regulations.

Please ensure the renewal deposit certificate retains the statutory lien in favour of {{lien_in_favour}}.

Bureau of Regulation, AICTE""",
        'version': 1,
        'is_active': True,
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
    },
    {
        'id': 'template-004',
        'template_name': 'Missing Document Notification',
        'template_type': 'missing_document_notice',
        'description': 'Notice issued when mandatory deposit certificate scan or bank acknowledgment is absent.',
        'template_content': """REF: AICTE/DOC/DEFIC/{{fdr_number}}
Date: {{current_date}}

To,
{{institution_name}}

Subject: Regulatory Deficiency Notice: Missing Verification Documents for Deposit {{fdr_number}}

Sir / Madam,

Upon custodial inspection of security deposit record {{fdr_number}}, mandatory documents were found deficient or unverified.

You are directed to upload authenticated color scans of the deficient instruments via the institutional portal within 7 business days of receipt of this notice.

Compliance Division, AICTE""",
        'version': 1,
        'is_active': True,
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
    },
    {
        'id': 'template-005',
        'template_name': 'Compliance Clarification Letter',
        'template_type': 'compliance_clarification',
        'description': 'Formal inquiry regarding discrepancies or bank heartbeat alerts.',
        'template_content': """REF: AICTE/COMP/CLAR/{{fdr_number}}
Date: {{current_date}}

To,
{{institution_name}}

Subject: Show Cause / Clarification Regarding Deposit Standing: FDR {{fdr_number}}

Sir / Madam,

Automated surveillance heartbeat pings to {{bank_name}} regarding deposit {{fdr_number}} reported an operational discrepancy.

You are hereby requested to submit a written explanation signed by the authorized management along with a fresh Bank Confirmation Certificate within 14 calendar days.

Member Secretary / Legal Cell, AICTE""",
        'version': 1,
        'is_active': True,
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
    },
    {
        'id': 'template-006',
        'template_name': 'Institution-level FDR Summary Report',
        'template_type': 'institution_summary_report',
        'description': 'Comprehensive institutional audit summary of all active and matured deposit reserves.',
        'template_content': """AICTE CUSTODIAL AUDIT SUMMARY REPORT
Generated On: {{current_date}}
Institution: {{institution_name}}

This report constitutes an authenticated system excerpt of security deposit instruments in custody from the National FDR-Chain Repository.

National Directorate of Regulatory Approvals, AICTE""",
        'version': 1,
        'is_active': True,
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
    }
]

class ComplianceService:
    def __init__(self):
        # In-memory stores
        self.templates: Dict[str, Dict[str, Any]] = {t['id']: dict(t) for t in INITIAL_TEMPLATES}
        self.documents: Dict[str, Dict[str, Any]] = {}
        self.versions: Dict[str, List[Dict[str, Any]]] = {} # doc_id -> list of versions
        self.reviews: Dict[str, List[Dict[str, Any]]] = {} # doc_id -> list of reviews
        self.signatures: Dict[str, Dict[str, Any]] = {} # doc_id -> mock signature
        self.pdf_blobs: Dict[str, bytes] = {} # doc_id -> pdf binary

    # 1. Template Operations
    def list_templates(self, active_only: bool = True) -> List[Dict[str, Any]]:
        tpls = list(self.templates.values())
        if active_only:
            tpls = [t for t in tpls if t.get('is_active', True)]
        return tpls

    def get_template(self, template_id: str) -> Dict[str, Any]:
        if template_id not in self.templates:
            raise KeyError(f"Template {template_id} not found.")
        return self.templates[template_id]

    def create_template(self, payload: ComplianceTemplateCreate, user_id: Optional[str] = None) -> Dict[str, Any]:
        tpl_id = f"template-{uuid.uuid4().hex[:8]}"
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        tpl = {
            'id': tpl_id,
            'template_name': payload.template_name,
            'template_type': payload.template_type,
            'description': payload.description,
            'template_content': payload.template_content,
            'version': 1,
            'is_active': payload.is_active if payload.is_active is not None else True,
            'created_by': user_id,
            'created_at': now_str,
            'updated_at': now_str,
        }
        self.templates[tpl_id] = tpl
        return tpl

    def update_template(self, template_id: str, payload: ComplianceTemplateUpdate) -> Dict[str, Any]:
        tpl = self.get_template(template_id)
        if payload.template_name is not None:
            tpl['template_name'] = payload.template_name
        if payload.description is not None:
            tpl['description'] = payload.description
        if payload.template_content is not None:
            tpl['template_content'] = payload.template_content
            tpl['version'] = tpl.get('version', 1) + 1
        if payload.is_active is not None:
            tpl['is_active'] = payload.is_active
        tpl['updated_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        return tpl

    # 2. Document Generation
    def generate_document(
        self,
        payload: ComplianceDocumentGenerateRequest,
        institution_record: Dict[str, Any],
        fdr_record: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        template = self.get_template(payload.template_id)

        # Build placeholder replacement dictionary
        now = datetime.datetime.now(datetime.timezone.utc)
        replacements: Dict[str, str] = {
            'current_date': now.strftime('%d-%b-%Y'),
            'institution_name': institution_record.get('name', 'N/A'),
            'institution_code': institution_record.get('code', 'N/A'),
            'institution_address': institution_record.get('address', 'N/A'),
            'region_name': institution_record.get('region_name', 'National'),
        }

        if fdr_record:
            replacements.update({
                'fdr_number': fdr_record.get('fdr_number', 'N/A'),
                'amount': f"{float(fdr_record.get('amount', 0)):,.2f}",
                'amount_in_words': f"{float(fdr_record.get('amount', 0)):,.2f} INR",
                'bank_name': fdr_record.get('bank_name', 'N/A'),
                'branch_name': fdr_record.get('branch_name', 'N/A'),
                'ifsc_code': fdr_record.get('ifsc_code', 'N/A'),
                'issue_date': str(fdr_record.get('issue_date', 'N/A')),
                'maturity_date': str(fdr_record.get('maturity_date', 'N/A')),
                'lien_in_favour': fdr_record.get('lien_in_favour', 'All India Council for Technical Education (AICTE)'),
                'discrepancy_details': 'Premature discharge alert received from depository branch CBS'
            })
        else:
            replacements.update({
                'fdr_number': 'ALL-ACTIVE-DEPOSITS',
                'amount': 'N/A',
                'bank_name': 'N/A',
                'branch_name': 'N/A',
                'maturity_date': 'N/A',
                'lien_in_favour': 'AICTE',
                'discrepancy_details': 'Periodic routine inquiry'
            })

        # Apply any variable overrides
        if payload.variable_overrides:
            for k, v in payload.variable_overrides.items():
                replacements[k] = str(v)

        content = template['template_content']
        for k, v in replacements.items():
            content = content.replace(f"{{{{{k}}}}}", v)

        doc_id = f"doc-{uuid.uuid4().hex[:8]}"
        title = payload.custom_title or f"{template['template_name']} - {institution_record.get('name', '')}"
        now_str = now.isoformat()

        content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()

        doc = {
            'id': doc_id,
            'institution_id': payload.institution_id,
            'institution_name': institution_record.get('name'),
            'fdr_id': payload.fdr_id,
            'fdr_number': fdr_record.get('fdr_number') if fdr_record else None,
            'template_id': payload.template_id,
            'template_name': template['template_name'],
            'document_title': title,
            'document_type': template['template_type'],
            'document_status': 'draft',
            'current_version': 1,
            'content_text': content,
            'created_by': user_id or 'usr-admin-01',
            'created_by_name': 'Officer',
            'reviewed_by': None,
            'approved_by': None,
            'approved_at': None,
            'pdf_url': None,
            'created_at': now_str,
            'updated_at': now_str,
        }

        # Initial Version record
        version_item = {
            'id': f"ver-{doc_id}-1",
            'compliance_document_id': doc_id,
            'version_number': 1,
            'content_snapshot': {'text': content, 'replacements': replacements},
            'storage_path': f"compliance/{doc_id}/v1.txt",
            'content_hash': content_hash,
            'created_by': user_id,
            'created_at': now_str
        }

        self.documents[doc_id] = doc
        self.versions[doc_id] = [version_item]
        self.reviews[doc_id] = []

        return doc

    def get_document(self, doc_id: str) -> Dict[str, Any]:
        if doc_id not in self.documents:
            raise KeyError(f"Compliance document {doc_id} not found.")
        doc = dict(self.documents[doc_id])
        doc['versions'] = self.versions.get(doc_id, [])
        doc['reviews'] = self.reviews.get(doc_id, [])
        doc['mock_signature'] = self.signatures.get(doc_id)
        return doc

    def list_documents(
        self,
        institution_id: Optional[str] = None,
        fdr_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        docs = list(self.documents.values())
        if institution_id:
            docs = [d for d in docs if d.get('institution_id') == institution_id]
        if fdr_id:
            docs = [d for d in docs if d.get('fdr_id') == fdr_id]
        if status:
            docs = [d for d in docs if d.get('document_status') == status]
        return docs

    def update_draft(self, doc_id: str, payload: ComplianceDocumentDraftUpdate, user_id: Optional[str] = None) -> Dict[str, Any]:
        doc = self.documents.get(doc_id)
        if not doc:
            raise KeyError(f"Compliance document {doc_id} not found.")
        if doc['document_status'] not in ('draft', 'returned_for_correction'):
            raise ValueError(f"Cannot edit document in status '{doc['document_status']}'. Only drafts can be modified.")

        if payload.document_title:
            doc['document_title'] = payload.document_title
        doc['content_text'] = payload.content_text

        # Create new version snapshot
        new_version_num = doc['current_version'] + 1
        doc['current_version'] = new_version_num
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        doc['updated_at'] = now_str

        content_hash = hashlib.sha256(payload.content_text.encode('utf-8')).hexdigest()
        new_version = {
            'id': f"ver-{doc_id}-{new_version_num}",
            'compliance_document_id': doc_id,
            'version_number': new_version_num,
            'content_snapshot': {'text': payload.content_text},
            'storage_path': f"compliance/{doc_id}/v{new_version_num}.txt",
            'content_hash': content_hash,
            'created_by': user_id,
            'created_at': now_str
        }
        self.versions[doc_id].append(new_version)
        return doc

    def submit_for_review(self, doc_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        doc = self.documents.get(doc_id)
        if not doc:
            raise KeyError(f"Compliance document {doc_id} not found.")
        if doc['document_status'] not in ('draft', 'returned_for_correction'):
            raise ValueError(f"Cannot submit document with status '{doc['document_status']}'.")

        doc['document_status'] = 'submitted_for_review'
        doc['updated_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        return doc

    def review_document(self, doc_id: str, payload: ComplianceDocumentReviewRequest, user_id: Optional[str] = None) -> Dict[str, Any]:
        doc = self.documents.get(doc_id)
        if not doc:
            raise KeyError(f"Compliance document {doc_id} not found.")

        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        doc['reviewed_by'] = user_id

        if payload.action == 'approved':
            doc['document_status'] = 'approved'
            doc['approved_by'] = user_id
            doc['approved_at'] = now_str
        elif payload.action == 'returned_for_correction':
            doc['document_status'] = 'returned_for_correction'
        else:
            raise ValueError("Invalid review action. Allowed: 'approved', 'returned_for_correction'.")

        doc['updated_at'] = now_str

        # Append review entry
        self.reviews[doc_id].append({
            'id': f"rev-{uuid.uuid4().hex[:8]}",
            'compliance_document_id': doc_id,
            'version_id': self.versions[doc_id][-1]['id'] if self.versions.get(doc_id) else None,
            'reviewer_id': user_id or 'usr-supervisor-01',
            'review_status': payload.action,
            'comments': payload.comments,
            'reviewed_at': now_str
        })
        return doc

    def finalize_pdf(self, doc_id: str, user_id: Optional[str] = None) -> bytes:
        doc = self.documents.get(doc_id)
        if not doc:
            raise KeyError(f"Compliance document {doc_id} not found.")
        if doc['document_status'] not in ('approved', 'finalized'):
            raise ValueError(f"Document must be approved prior to PDF finalization (current: '{doc['document_status']}').")

        # Generate PDF using ReportLab if installed
        buffer = io.BytesIO()
        if REPORTLAB_AVAILABLE:
            doc_pdf = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
            styles = getSampleStyleSheet()

            # Custom styles
            header_style = ParagraphStyle(
                'GovHeader',
                parent=styles['Heading1'],
                fontSize=14,
                leading=18,
                textColor=colors.HexColor('#12345A'),
                alignment=1
            )
            sub_style = ParagraphStyle(
                'GovSub',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#555555'),
                alignment=1
            )
            body_style = ParagraphStyle(
                'GovBody',
                parent=styles['Normal'],
                fontSize=10,
                leading=14,
                textColor=colors.HexColor('#1E293B')
            )
            disclaimer_style = ParagraphStyle(
                'DemoDisclaimer',
                parent=styles['Normal'],
                fontSize=9,
                leading=11,
                textColor=colors.HexColor('#DC2626'),
                alignment=1
            )

            story = [
                Paragraph("<b>ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</b>", header_style),
                Paragraph("Central FDR Custodial Oversight & Regulatory Compliance Directorate", sub_style),
                Spacer(1, 10),
                HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#12345A'), spaceAfter=15),
            ]

            # Document Title
            story.append(Paragraph(f"<b>{doc['document_title']}</b>", styles['Heading2']))
            story.append(Spacer(1, 10))

            # Main text content lines
            lines = doc.get('content_text', '').split('\n')
            for line in lines:
                if line.strip():
                    story.append(Paragraph(line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'), body_style))
                else:
                    story.append(Spacer(1, 6))

            # If mock signed, append visible stamp and mandatory disclaimer
            sig = self.signatures.get(doc_id)
            if sig:
                story.append(Spacer(1, 20))
                story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=10))
                story.append(Paragraph(f"<b>MOCK E-SIGN DEMONSTRATION VERIFIED</b>", body_style))
                story.append(Paragraph(f"Signer: {sig['signer_display_name']} | Reference: {sig['signature_reference']} | Date: {sig['signed_at']}", body_style))
                story.append(Spacer(1, 6))
                story.append(Paragraph(f"<b>{sig['disclaimer']}</b>", disclaimer_style))

            doc_pdf.build(story)
            pdf_bytes = buffer.getvalue()
        else:
            # Fallback text-based PDF header
            pdf_bytes = doc.get('content_text', '').encode('utf-8')

        self.pdf_blobs[doc_id] = pdf_bytes
        doc['document_status'] = 'finalized'
        doc['pdf_url'] = f"/api/v1/compliance/documents/{doc_id}/pdf"
        doc['updated_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        return pdf_bytes

    def mock_sign(self, doc_id: str, payload: MockSignRequest, user_id: str) -> Dict[str, Any]:
        """Demonstration of mock e-signing with mandatory simulation disclaimer"""
        doc = self.documents.get(doc_id)
        if not doc:
            raise KeyError(f"Compliance document {doc_id} not found.")
        if not payload.consent_acknowledged:
            raise ValueError("Consent acknowledgment is required for demonstration signing.")

        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        sig_ref = f"MOCK-SIG-{uuid.uuid4().hex[:8].upper()}"

        mock_sig: Dict[str, Any] = {
            'signature_reference': sig_ref,
            'signer_display_name': payload.signer_display_name,
            'signer_user_id': user_id,
            'signed_at': now_str,
            'disclaimer': 'DEMO — NOT A LEGALLY VALID DIGITAL SIGNATURE',
            'status': 'demonstration_only'
        }

        self.signatures[doc_id] = mock_sig

        # Append to document text and record new version
        signed_text = f"{doc.get('content_text', '')}\n\n[MOCK SIGNATURE ATTACHED]\nSigner: {payload.signer_display_name}\nReference: {sig_ref}\nDate: {now_str}\nDISCLAIMER: DEMO — NOT A LEGALLY VALID DIGITAL SIGNATURE"
        doc['content_text'] = signed_text

        new_version_num = doc['current_version'] + 1
        doc['current_version'] = new_version_num
        doc['updated_at'] = now_str

        content_hash = hashlib.sha256(signed_text.encode('utf-8')).hexdigest()
        new_version = {
            'id': f"ver-{doc_id}-{new_version_num}",
            'compliance_document_id': doc_id,
            'version_number': new_version_num,
            'content_snapshot': {'text': signed_text, 'mock_signature': mock_sig},
            'storage_path': f"compliance/{doc_id}/v{new_version_num}.txt",
            'content_hash': content_hash,
            'created_by': user_id,
            'created_at': now_str
        }
        self.versions[doc_id].append(new_version)

        # Regenerate PDF if previously generated
        if doc['document_status'] in ('approved', 'finalized'):
            self.finalize_pdf(doc_id, user_id)

        return mock_sig

compliance_service = ComplianceService()
