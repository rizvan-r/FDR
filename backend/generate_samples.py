"""
Generate synthetic sample spreadsheets (CSV and XLSX) for Phase 7 Legacy Migration testing.
Includes:
- Valid rows across various AICTE institutions (ENG, MGMT, PHARM)
- Row with intentional negative amount (triggers validation flag)
- Row with invalid date format (triggers validation flag)
- Row with fuzzy duplicate potential
"""
import csv
from datetime import date
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

HEADERS = [
    "FDR Number",
    "Institution Code",
    "Institution Name",
    "Bank Name",
    "Branch Name",
    "IFSC Code",
    "Account Number",
    "Principal Amount",
    "Interest Rate (%)",
    "Deposit Date",
    "Maturity Date",
    "Joint Holder AICTE",
    "Auto Renewal Flag",
    "Remarks / Notes"
]

SAMPLE_ROWS = [
    [
        "SBI-FDR-2022-8801",
        "1-10023456",
        "Delhi Engineering Institute of Technology",
        "State Bank of India",
        "Parliament Street, New Delhi",
        "SBIN0000691",
        "109283746501",
        1500000,
        7.25,
        "2022-04-15",
        "2025-04-15",
        "Yes",
        "Yes",
        "Original endowment FDR created for AICTE new polytechnic approval"
    ],
    [
        "HDFC-FDR-2021-9923",
        "1-10023456",
        "Delhi Engineering Institute of Technology",
        "HDFC Bank",
        "Connaught Place, New Delhi",
        "HDFC0000003",
        "501002938475",
        2500000,
        6.80,
        "2021-08-20",
        "2024-08-20",
        "Yes",
        "No",
        "Security deposit for PG Diploma Mechanical Engineering division"
    ],
    [
        "PNB-FDR-2023-4412",
        "1-10045678",
        "Bangalore Institute of Management",
        "Punjab National Bank",
        "MG Road, Bengaluru",
        "PUNB0012300",
        "0123002100098765",
        3000000,
        7.50,
        "2023-01-10",
        "2026-01-10",
        "Yes",
        "Yes",
        "MBA intake expansion compliance FDR"
    ],
    [
        "CAN-FDR-2020-5521",
        "1-10067890",
        "Mumbai College of Pharmacy & Research",
        "Canara Bank",
        "Fort, Mumbai",
        "CNRB0000100",
        "0100101034567",
        1800000,
        7.10,
        "2020-11-05",
        "2025-11-05",
        "Yes",
        "No",
        "B.Pharm statutory corpus deposit"
    ],
    [
        "BOB-FDR-2022-3349",
        "1-10089012",
        "Chennai National Polytechnic",
        "Bank of Baroda",
        "Anna Salai, Chennai",
        "BARB0ANNASA",
        "21340200001234",
        1200000,
        6.95,
        "2022-06-30",
        "2025-06-30",
        "Yes",
        "Yes",
        "Civil & Mechanical lab modernization guarantee FDR"
    ],
    # Row 6: Error row - Negative amount
    [
        "AXIS-FDR-ERR-001",
        "1-10023456",
        "Delhi Engineering Institute of Technology",
        "Axis Bank",
        "Nehru Place, New Delhi",
        "UTIB0000005",
        "912010034567890",
        -500000,
        7.0,
        "2022-01-01",
        "2025-01-01",
        "Yes",
        "No",
        "Intentional Error: Negative principal amount to verify validation engine"
    ],
    # Row 7: Error row - Invalid date format
    [
        "ICICI-FDR-ERR-002",
        "1-10045678",
        "Bangalore Institute of Management",
        "ICICI Bank",
        "Koramangala, Bengaluru",
        "ICIC0000002",
        "000201005678",
        2000000,
        7.20,
        "INVALID-DATE",
        "2026-12-31",
        "Yes",
        "Yes",
        "Intentional Error: Malformed start date to verify row quarantine and manual correction modal"
    ]
]

def generate_csv():
    csv_path = "sample_migration.csv"
    with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(HEADERS)
        for row in SAMPLE_ROWS:
            writer.writerow(row)
    print(f"Generated {csv_path}")

def generate_xlsx():
    xlsx_path = "sample_migration.xlsx"
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Legacy_FDR_Archive"

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="12345A", end_color="12345A", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    ws.append(HEADERS)
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment

    for row in SAMPLE_ROWS:
        ws.append(row)

    # Auto-adjust column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, 14), 45)

    ws.row_dimensions[1].height = 28
    wb.save(xlsx_path)
    print(f"Generated {xlsx_path}")

if __name__ == "__main__":
    generate_csv()
    generate_xlsx()
