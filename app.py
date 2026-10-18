import streamlit as st
import pandas as pd
from datetime import datetime

st.set_page_config(page_title="ניהול תקציב חכם", layout="centered", initial_sidebar_state="collapsed")

# --- CSS עיצוב פינטק נקי ומודרני (Clean Fintech) ---
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Rubik', sans-serif;
        direction: rtl;
        text-align: right;
    }
    
    .stApp {
        background-color: #0B132B;
        color: #F8FAFC;
    }
    
    [data-testid="stSidebar"], [data-testid="collapsedControl"], .skiptocontent, a.skiptocontent {
        display: none !important;
    }
    
    .block-container {
        padding-top: 0.8rem !important;
        padding-bottom: 2rem !important;
        padding-left: 0.8rem !important;
        padding-right: 0.8rem !important;
    }

    /* כרטיסיית יתרה ראשית */
    .hero-card {
        background: linear-gradient(135deg, #1C2541 0%, #0B132B 100%);
        border: 1px solid #3A506B;
        border-radius: 16px;
        padding: 18px 14px;
        text-align: center;
        margin-bottom: 14px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .hero-title {
        font-size: 0.85rem;
        color: #94A3B8;
        font-weight: 500;
        margin-bottom: 4px;
    }
    .hero-amount {
        font-size: 2.2rem;
        font-weight: 700;
        color: #48CAE4;
        direction: ltr;
        margin-bottom: 12px;
    }
    .hero-stats {
        display: flex;
        justify-content: space-between;
        border-top: 1px solid #3A506B;
        padding-top: 10px;
        font-size: 0.75rem;
    }
    .hero-stat-val {
        font-weight: 700;
        color: #F1F5F9;
        display: block;
        margin-top: 2px;
    }

    /* שורת פריט בציר הזמן הכרונולוגי */
    .ledger-row {
        background-color: #1C2541;
        border-radius: 12px;
        padding: 10px 14px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 1px solid #3A506B;
    }
    
    /* עיצוב כפתורי פעולה רגילים */
    .stButton > button {
        border-radius: 8px !important;
        background-color: #3A506B !important;
        color: #48CAE4 !important;
        border: none !important;
        font-weight: 600 !important;
        font-size: 0.8rem !important;
        width: 100% !important;
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

# לוגיקת מחזור (10 עד 9)
def get_billing_cycle(dt):
    if pd.isna(dt): 
        dt = datetime.now()
    if dt.day >= 10:
        start = dt.replace(day=10)
        end = dt.replace(year=dt.year + 1, month=1, day=9) if dt.month == 12 else dt.replace(month=dt.month + 1, day=9)
    else:
        end = dt.replace(day=9)
        start = dt.replace(year=dt.year - 1, month=12, day=10) if dt.month == 1 else dt.replace(month=dt.month - 1, day=10)
    return start, end, f"{start.strftime('%d/%m/%Y')} - {end.strftime('%d/%m/%Y')}"

start_dt, end_dt, today_cycle = get_billing_cycle(datetime.now())

if not df.empty:
    amount_col = next((col for col in df.columns if 'סכום' in col), 'סכום')
    type_col = next((col for col in df.columns if 'סוג' in col), 'סוג הוצאה')
    name_col = next((col for col in df.columns if 'עסק' in col), 'שם עסק')
    date_col = next((col for col in df.columns if 'תאריך' in col), 'תאריך')
    cat_col = next((col for col in df.columns if 'קטגוריה' in col), 'קטגוריה')

    df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce').fillna(0)
    
    df['parsed_date'] = pd.to_datetime(df[date_col], errors='coerce', dayfirst=True)
    if df['parsed_date'].isna().sum() > 0:
        df['parsed_date'] = df['parsed_date'].fillna(pd.to_datetime(df[date_col], errors='coerce', format='mixed'))
    df['parsed_date'] = df['parsed_date'].fillna(datetime.now())

    def assign_cycle(d):
        s, e, c_str = get_billing_cycle(d)
        return c_str
    
    df['מחזור'] = df['parsed_date'].apply(assign_cycle)
    
    available_cycles = sorted(df['מחזור'].dropna().unique(), reverse=True)
    if today_cycle in available_cycles:
        available_cycles.remove(today_cycle)
    available_cycles.insert(0, today_cycle)

    st.caption("📅 מחזור תקציב פעיל:")
    selected_cycle = st.selectbox("בחירת מחזור", available_cycles, index=0, label_visibility="collapsed")
    
    filtered_df = df[df['מחזור'] == selected_cycle]
else:
    filtered_df = pd.DataFrame()
    amount_col, type_col, name_col, date_col, cat_col = 'סכום', 'סוג הוצאה', 'שם עסק', 'תאריך', 'קטגוריה'
    selected_cycle = today_cycle
    st.caption("📅 מחזור תקציב פעיל:")
    st.selectbox("בחירת מחזור", [today_cycle], index=0, label_visibility="collapsed")

# הוצאות קבועות צפויות
next_month = start_dt.replace(year=start_dt.year + 1, month=1) if start_dt.month == 12 else start_dt.replace(month=start_dt.month + 1)

expected_fixed_expenses = {
    "שכירות / משכנתא": {"amount": 4500.0, "day": 25, "cat": "דיור"},
    "סולמייט (חיות)": {"amount": 857.0, "day": 28, "cat": "חיות מחמד"},
    "עירית בני ברק": {"amount": 541.6, "day": 1, "cat": "מיסים", "month_offset": 1},
    "חשמל": {"amount": 350.0, "day": 1, "cat": "תשתיות", "month_offset": 1},
    "אינטרנט וטלפון": {"amount": 150.0, "day": 5, "cat": "תקשורת", "month_offset": 1}
}

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

unpaid_fixed_dict = {}
for item_name, info in expected_fixed_expenses.items():
    if not any(p_name in item_name or item_name in str(p_name) for p_name in paid_names):
        unpaid_fixed_dict[item_name] = info

unpaid_fixed_total = sum([info["amount"] for info in unpaid_fixed_dict.values()])
true_remaining = estimated_income - (total_fixed_paid + total_variable + unpaid_fixed_total)

# --- 1. כרטיסיית HERO הראשית ---
st.markdown(f"""
<div class="hero-card">
    <div class="hero-title">יתרה פנויה להוצאות</div>
    <div class="hero-amount">₪{true_remaining:,.2f}</div>
    <div class="hero-stats">
        <div>הכנסה<span class="hero-stat-val">₪{estimated_income:,.0f}</span></div>
        <div>משתנות<span class="hero-stat-val">₪{total_variable:,.0f}</span></div>
        <div>קבועות שירדו<span class="hero-stat-val">₪{total_fixed_paid:,.0f}</span></div>
        <div>בקנה (צפוי)<span class="hero-stat-val" style="color:#E0A96D;">₪{unpaid_fixed_total:,.0f}</span></div>
    </div>
</div>
""", unsafe_allow_html=True)

# --- 2. כפתור הוספת עסקה מהירה ---
with st.expander("➕ הוספת עסקה חדשה למחזור"):
    with st.form("main_add_tx"):
        q_name = st.text_input("שם עסק")
        q_amt = st.number_input("סכום (₪)", min_value=0.0)
        q_type = st.selectbox("סוג", ["משתנה", "קבוע"])
        q_cat = st.selectbox("קטגוריה", ["סופר ופארם", "רכב ותחבורה", "בילויים", "חיות", "שונות"])
        if st.form_submit_button("שמור עסקה"):
            if q_name and q_amt > 0:
                st.session_state.added_transactions.append({
                    date_col: datetime.now().strftime('%Y-%m-%d'),
                    name_col: q_name,
                    amount_col: q_amt,
                    type_col: q_type,
                    cat_col: q_cat
                })
                st.success("העסקה נוספה בהצלחה!")
                st.rerun()

st.divider()

# --- הגדרת חלון דיאלוג (Modal) לעדכון חיוב ---
@st.dialog("עדכון חיוב והעברה לבוצע")
def edit_expense_dialog(item_name, default_amt, category):
    st.write(f"עדכון סכום בפועל עבור **{item_name}**:")
    new_amt = st.number_input("סכום (₪)", value=float(default_amt))
    if st.button("אישור וסימון כבוצע", type="primary"):
        st.session_state.added_transactions.append({
            date_col: datetime.now().strftime('%Y-%m-%d'),
            name_col: item_name,
            amount_col: new_amt,
            type_col: "קבוע",
            cat_col: category
        })
        st.success("החיוב עודכן בהצלחה!")
        st.rerun()

# --- 3. ציר זמן תזרימי אחיד (Chronological Ledger) ---
st.markdown("### **תזרימי מחזור (לפי תאריך)**")

timeline_items = []

added_keys = set()
for item_name, info in unpaid_fixed_dict.items():
    if item_name in added_keys:
        continue
    added_keys.add(item_name)
    
    d_val = info["day"]
    m_val = next_month.month if info.get("month_offset", 0) == 1 else start_dt.month
    y_val = next_month.year if info.get("month_offset", 0) == 1 and m_val == 1 else start_dt.year
    try:
        item_date = datetime(y_val, m_val, d_val)
    except:
        item_date = start_dt
        
    timeline_items.append({
        "date": item_date,
        "date_str": item_date.strftime('%d/%m/%Y'),
        "name": item_name,
        "category": info["cat"],
        "amount": info["amount"],
        "status": "pending",
        "key": item_name
    })

if not filtered_df.empty:
    for _, row in filtered_df.iterrows():
        p_date = row['parsed_date']
        timeline_items.append({
            "date": p_date,
            "date_str": pd.to_datetime(p_date).strftime('%d/%m/%Y') if pd.notna(p_date) else "",
            "name": str(row[name_col]),
            "category": str(row.get(cat_col, 'כללי')),
            "amount": float(row[amount_col]),
            "status": "done",
            "key": str(row[name_col]) + str(row[amount_col])
        })

timeline_items.sort(key=lambda x: x["date"])

for item in timeline_items:
    if item["status"] == "pending":
        col_info, col_btn = st.columns([3, 1])
        with col_info:
            st.markdown(f"""
            <div class="ledger-row" style="border-right: 3px solid #E0A96D;">
                <div>
                    <div style="font-size:0.75rem; color:#94A3B8;">{item['date_str']} • ממתין</div>
                    <div style="font-weight:600; font-size:0.95rem; margin-top:2px;">{item['name']}</div>
                    <div style="font-size:0.75rem; color:#64748B;">{item['category']}</div>
                </div>
                <div style="font-weight:700; direction:ltr; color:#E0A96D; font-size:0.95rem;">₪{item['amount']:,.1f}</div>
            </div>
            """, unsafe_allow_html=True)
        with col_btn:
            if st.button("עדכן", key=f"btn_{item['key']}"):
                edit_expense_dialog(item['key'], item['amount'], item['category'])
    else:
        st.markdown(f"""
        <div class="ledger-row" style="border-right: 3px solid #4ADE80;">
            <div>
                <div style="font-size:0.75rem; color:#94A3B8;">{item['date_str']} • בוצע</div>
                <div style="font-weight:600; font-size:0.95rem; margin-top:2px;">{item['name']}</div>
                <div style="font-size:0.75rem; color:#64748B;">{item['category']}</div>
            </div>
            <div style="font-weight:700; direction:ltr; color:#F8FAFC; font-size:0.95rem;">₪{item['amount']:,.1f}</div>
        </div>
        """, unsafe_allow_html=True)
