import streamlit as st
import pandas as pd
from datetime import datetime

st.set_page_config(page_title="תקציב אישי", layout="centered")

# עיצוב מותאם מובייל קומפקטי
st.markdown(
    """
    <style>
    div.block-container {
        direction: rtl;
        text-align: right;
        padding-top: 0.5rem;
        padding-bottom: 1rem;
    }
    h1 {
        font-size: 1.6rem !important;
        margin-bottom: 0.5rem !important;
    }
    h3 {
        font-size: 1.2rem !important;
        margin-top: 1rem !important;
        margin-bottom: 0.5rem !important;
    }
    /* התאמת מדדים לתצוגה אופקית במובייל */
    div[data-testid="stHorizontalBlock"] > div {
        flex: 1 1 0px !important;
        min-width: 0px !important;
    }
    .stMetric {
        background-color: #1e222d;
        border-radius: 8px;
        padding: 6px 8px !important;
        text-align: center;
    }
    .stMetric label {
        font-size: 0.75rem !important;
        white-space: nowrap;
    }
    .stMetric div[data-testid="stMetricValue"] {
        font-size: 1.0rem !important;
    }
    </style>
    """,
    unsafe_allow_html=True
)

st.title("💰 מעקב תקציב חודשי")

# זיכרון מקומי
if 'added_transactions' not in st.session_state:
    st.session_state.added_transactions = []

if 'business_types' not in st.session_state:
    st.session_state.business_types = {
        "עירית בני ברק": "קבוע",
        "סולמייט": "קבוע",
        "שכירות": "קבוע",
        "חשמל": "קבוע",
        "אינטרנט": "קבוע",
        "אושר עד": "משתנה"
    }

# טעינת נתונים מ-Google Sheets
@st.cache_data(ttl=60)
def load_data():
    try:
        sheet_url = st.secrets["connections"]["gsheets"]["spreadsheet"]
        csv_url = sheet_url.split("/edit")[0] + "/export?format=csv" if "/edit" in sheet_url else sheet_url
        df = pd.read_csv(csv_url)
        df.columns = df.columns.str.strip()
        return df
    except Exception:
        return pd.DataFrame()

base_df = load_data()

if st.session_state.added_transactions:
    new_df = pd.DataFrame(st.session_state.added_transactions)
    df = pd.concat([base_df, new_df], ignore_index=True) if not base_df.empty else new_df
else:
    df = base_df

if not df.empty:
    amount_col = next((col for col in df.columns if 'סכום' in col), 'סכום')
    type_col = next((col for col in df.columns if 'סוג' in col), 'סוג הוצאה')
    name_col = next((col for col in df.columns if 'עסק' in col), 'שם עסק')
    date_col = next((col for col in df.columns if 'תאריך' in col), 'תאריך')
    cat_col = next((col for col in df.columns if 'קטגוריה' in col), 'קטגוריה')

    df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce').fillna(0)
    df['parsed_date'] = pd.to_datetime(df[date_col], errors='coerce')
    
    def get_billing_cycle(dt):
        if pd.isna(dt): return "לא ידוע"
        if dt.day >= 10:
            start = dt.replace(day=10)
            end = dt.replace(year=dt.year + 1, month=1, day=9) if dt.month == 12 else dt.replace(month=dt.month + 1, day=9)
        else:
            end = dt.replace(day=9)
            start = dt.replace(year=dt.year - 1, month=12, day=10) if dt.month == 1 else dt.replace(month=dt.month - 1, day=10)
        return f"{start.strftime('%d/%m')} - {end.strftime('%d/%m/%Y')}"

    df['מחזור'] = df['parsed_date'].apply(get_billing_cycle)
    
    for biz, b_type in st.session_state.business_types.items():
        mask = df[name_col].astype(str).str.contains(biz, na=False)
        df.loc[mask, type_col] = b_type

    available_cycles = sorted(df['מחזור'].dropna().unique(), reverse=True)
    selected_cycle = st.sidebar.selectbox("📅 מחזור תקציב:", available_cycles if available_cycles else ["נוכחי"])
    filtered_df = df[df['מחזור'] == selected_cycle] if selected_cycle else df
else:
    filtered_df = pd.DataFrame()
    amount_col, type_col, name_col, date_col, cat_col = 'סכום', 'סוג הוצאה', 'שם עסק', 'תאריך', 'קטגוריה'
    selected_cycle = "10/09 - 09/10/2026"

expected_fixed_expenses = {
    "שכירות / משכנתא": 4500.0,
    "סולמייט": 857.0,
    "עירית בני ברק": 541.6,
    "חשמל": 350.0,
    "אינטרנט וטלפון": 150.0
}

# חישובים
estimated_income = 17750.0

if not filtered_df.empty:
    fixed_paid_df = filtered_df[filtered_df[type_col].astype(str).str.contains('קבוע', na=False)]
    variable_df = filtered_df[filtered_df[type_col].astype(str).str.contains('משתנה', na=False)]
    total_fixed_paid = fixed_paid_df[amount_col].sum()
    total_variable = variable_df[amount_col].sum()
else:
    total_fixed_paid, total_variable = 0.0, 0.0
    fixed_paid_df, variable_df = pd.DataFrame(), pd.DataFrame()

paid_names = fixed_paid_df[name_col].tolist() if not fixed_paid_df.empty else []
unpaid_fixed_dict = {item: exp for item, exp in expected_fixed_expenses.items() 
                     if not any(p_name in item or item in str(p_name) for p_name in paid_names)}

unpaid_fixed_total = sum(unpaid_fixed_dict.values())
true_remaining = estimated_income - (total_fixed_paid + total_variable + unpaid_fixed_total)

# --- תצוגת מסך הבית הקומפקטית ---

# 1. שורת מדדים קומפקטית בשורה אחת
m1, m2, m3 = st.columns(3)
m1.metric("💎 יתרה", f"₪{true_remaining:,.0f}")
m2.metric("🛍️ משתנות", f"₪{total_variable:,.0f}")
m3.metric("⏳ בקנה", f"₪{unpaid_fixed_total:,.0f}")

st.divider()

# 2. הוצאות קבועות בטבלה
st.subheader("📌 הוצאות קבועות")

fixed_rows = []
for item_name, exp_amount in expected_fixed_expenses.items():
    is_paid = item_name not in unpaid_fixed_dict
    if is_paid:
        actual_row = fixed_paid_df[fixed_paid_df[name_col].astype(str).str.contains(item_name, na=False)]
        amt = actual_row[amount_col].values[0] if not actual_row.empty else exp_amount
        fixed_rows.append({"סכום": f"₪{amt:,.1f}", "שם עסק": item_name, "סטטוס": "🟢 ירד"})
    else:
        fixed_rows.append({"סכום": f"₪{exp_amount:,.1f}", "שם עסק": item_name, "סטטוס": "🟠 ממתין"})

st.dataframe(pd.DataFrame(fixed_rows), use_container_width=True, hide_index=True)

# אזור עדכון הוצאה קבועה שירדה
with st.expander("➕ עדכן הוצאה קבועה שירדה"):
    with st.form("mark_fixed_form"):
        unpaid_items = list(unpaid_fixed_dict.keys())
        if unpaid_items:
            item_to_update = st.selectbox("בחר הוצאה", unpaid_items)
            updated_amt = st.number_input("סכום בפועל (₪)", value=float(unpaid_fixed_dict[item_to_update]))
            if st.form_submit_button("סמן כמשולם"):
                st.session_state.added_transactions.append({
                    date_col: datetime.now().strftime('%Y-%m-%d'),
                    name_col: item_to_update,
                    amount_col: updated_amt,
                    type_col: "קבוע",
                    cat_col: "חשבונות ודירה"
                })
                st.success("עודכן!")
                st.rerun()
        else:
            st.info("כל ההוצאות הקבועות למחזור זה כבר ירדו! 🎉")

st.divider()

# 3. עסקאות משתנות
st.subheader("🛍️ עסקאות משתנות במחזור")
if not variable_df.empty:
    display_var = variable_df.copy()
    display_var['תאריך'] = display_var['parsed_date'].dt.strftime('%d/%m')
    st.dataframe(
        display_var[['תאריך', name_col, amount_col]],
        use_container_width=True,
        hide_index=True
    )
else:
    st.caption("אין עסקאות משתנות רשומות למחזור זה.")

# טופס להוספת עסקה מהירה בסרגל הצד
with st.sidebar.form("quick_add"):
    st.subheader("➕ הוספת עסקה")
    q_name = st.text_input("שם עסק")
    q_amt = st.number_input("סכום", min_value=0.0)
    q_type = st.selectbox("סוג", ["משתנה", "קבוע"])
    q_cat = st.selectbox("קטגוריה", ["סופר ופארם", "רכב ותחבורה", "בילויים", "דיור", "חיות", "שונות"])
    if st.form_submit_button("שמור"):
        if q_name and q_amt > 0:
            st.session_state.added_transactions.append({
                date_col: datetime.now().strftime('%Y-%m-%d'),
                name_col: q_name,
                amount_col: q_amt,
                type_col: q_type,
                cat_col: q_cat
            })
            st.rerun()
