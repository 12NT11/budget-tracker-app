import streamlit as st
import pandas as pd
from datetime import datetime

st.set_page_config(page_title="ניהול תקציב חכם", layout="centered", initial_sidebar_state="collapsed")

# --- CSS עיצוב מתקדם בסגנון RiseUp למובייל ---
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Rubik', sans-serif;
        direction: rtl;
        text-align: right;
    }
    
    .stApp {
        background-color: #0F172A;
        color: #F8FAFC;
    }
    
    /* כרטיסיית יתרה ראשית */
    .hero-card {
        background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
        border: 1px solid #334155;
        border-radius: 20px;
        padding: 20px;
        text-align: center;
        margin-bottom: 20px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    .hero-title {
        font-size: 0.9rem;
        color: #94A3B8;
        margin-bottom: 5px;
    }
    .hero-amount {
        font-size: 2.2rem;
        font-weight: 700;
        color: #38BDF8;
        direction: ltr;
        margin-bottom: 12px;
    }
    .hero-stats {
        display: flex;
        justify-content: space-around;
        border-top: 1px solid #334155;
        padding-top: 12px;
        font-size: 0.8rem;
    }
    .hero-stat-val {
        font-weight: 600;
        color: #F1F5F9;
    }

    /* כרטיסיית הוצאה/פריט */
    .item-card {
        background-color: #1E293B;
        border-radius: 14px;
        padding: 12px 16px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 1px solid #334155;
    }
    .item-title {
        font-weight: 500;
        font-size: 0.95rem;
        color: #F8FAFC;
    }
    .item-sub {
        font-size: 0.75rem;
        color: #64748B;
    }
    .item-amount {
        font-weight: 700;
        font-size: 1rem;
        direction: ltr;
    }
    .status-paid { color: #4ADE80; }
    .status-pending { color: #FB923C; }

    /* התאמת אלמנטים מובנים של סטרימליט */
    .stButton>button {
        width: 100%;
        border-radius: 12px;
        background-color: #0284C7;
        color: white;
        font-weight: 600;
        border: none;
        padding: 8px 16px;
    }
</style>
""", unsafe_allow_html=True)

# --- טעינת נתונים ---
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

df = load_data()

if 'added_transactions' not in st.session_state:
    st.session_state.added_transactions = []

if st.session_state.added_transactions:
    new_df = pd.DataFrame(st.session_state.added_transactions)
    df = pd.concat([df, new_df], ignore_index=True) if not df.empty else new_df

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
    available_cycles = sorted(df['מחזור'].dropna().unique(), reverse=True)
    selected_cycle = st.selectbox("📅 מחזור פעיל:", available_cycles if available_cycles else ["נוכחי"])
    filtered_df = df[df['מחזור'] == selected_cycle]
else:
    filtered_df = pd.DataFrame()
    amount_col, type_col, name_col, date_col, cat_col = 'סכום', 'סוג הוצאה', 'שם עסק', 'תאריך', 'קטגוריה'
    selected_cycle = "10/09 - 09/10/2026"

expected_fixed_expenses = {
    "שכירות / משכנתא": 4500.0,
    "סולמייט (חיות)": 857.0,
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

# --- 1. כרטיסיית HERO הראשית (סגנון RiseUp) ---
st.markdown(f"""
<div class="hero-card">
    <div class="hero-title">💎 יתרה פנויה אמיתית להוצאות</div>
    <div class="hero-amount">₪{true_remaining:,.2f}</div>
    <div class="hero-stats">
        <div>הכנסה<br><span class="hero-stat-val">₪{estimated_income:,.0f}</span></div>
        <div>משתנות<br><span class="hero-stat-val">₪{total_variable:,.0f}</span></div>
        <div>קבועות שירדו<br><span class="hero-stat-val">₪{total_fixed_paid:,.0f}</span></div>
        <div>משוריין בקנה<br><span class="hero-stat-val" style="color:#FB923C;">₪{unpaid_fixed_total:,.0f}</span></div>
    </div>
</div>
""", unsafe_allow_html=True)

# --- 2. מעקב הוצאות קבועות (כרטיסיות נקיות) ---
st.subheader("📌 התחייבויות קבועות")

for item_name, exp_amount in expected_fixed_expenses.items():
    is_paid = item_name not in unpaid_fixed_dict
    
    col_info, col_action = st.columns([3, 1])
    
    with col_info:
        if is_paid:
            actual_row = fixed_paid_df[fixed_paid_df[name_col].astype(str).str.contains(item_name, na=False)]
            amt = actual_row[amount_col].values[0] if not actual_row.empty else exp_amount
            st.markdown(f"""
            <div class="item-card">
                <div>
                    <div class="item-title">🟢 {item_name}</div>
                    <div class="item-sub">ירד החודש</div>
                </div>
                <div class="item-amount status-paid">₪{amt:,.1f}</div>
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown(f"""
            <div class="item-card">
                <div>
                    <div class="item-title">🟠 {item_name}</div>
                    <div class="item-sub">צפוי לרדת</div>
                </div>
                <div class="item-amount status-pending">₪{exp_amount:,.1f}</div>
            </div>
            """, unsafe_allow_html=True)
            
    with col_action:
        if not is_paid:
            with st.popover("עדכן"):
                new_amt = st.number_input("סכום בפועל", value=float(exp_amount), key=f"p_{item_name}")
                if st.button("סמן כירד", key=f"b_{item_name}"):
                    st.session_state.added_transactions.append({
                        date_col: datetime.now().strftime('%Y-%m-%d'),
                        name_col: item_name,
                        amount_col: new_amt,
                        type_col: "קבוע",
                        cat_col: "חשבונות ודירה"
                    })
                    st.rerun()

st.divider()

# --- 3. עסקאות משתנות אחרונות ---
st.subheader("🛍️ עסקאות משתנות אחרונות")
if not variable_df.empty:
    for _, row in variable_df.tail(5).iterrows():
        t_date = pd.to_datetime(row['parsed_date']).strftime('%d/%m') if pd.notna(row['parsed_date']) else ""
        st.markdown(f"""
        <div class="item-card">
            <div>
                <div class="item-title">{row[name_col]}</div>
                <div class="item-sub">{t_date} | {row.get(cat_col, 'משתנה')}</div>
            </div>
            <div class="item-amount">₪{row[amount_col]:,.1f}</div>
        </div>
        """, unsafe_allow_html=True)
else:
    st.info("אין עסקאות משתנות במחזור זה.")

# טופס להוספת עסקה צף בסרגל הצד
with st.sidebar.form("add_tx"):
    st.subheader("➕ הוספת עסקה")
    q_name = st.text_input("שם עסק")
    q_amt = st.number_input("סכום (₪)", min_value=0.0)
    q_type = st.selectbox("סוג", ["משתנה", "קבוע"])
    q_cat = st.selectbox("קטגוריה", ["סופר ופארם", "רכב ותחבורה", "בילויים", "חיות", "שונות"])
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
