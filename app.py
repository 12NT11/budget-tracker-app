import streamlit as st
import pandas as pd
from datetime import datetime

st.set_page_config(page_title="ניהול תקציב חכם", layout="centered", initial_sidebar_state="collapsed")

# --- CSS עיצוב מתקדם בסגנון RiseUp ---
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
        background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
        border: 1px solid #334155;
        border-radius: 16px;
        padding: 16px 12px;
        text-align: center;
        margin-bottom: 12px;
        box-shadow: 0 8px 20px -5px rgba(0, 0, 0, 0.4);
    }
    .hero-title {
        font-size: 0.85rem;
        color: #94A3B8;
        margin-bottom: 4px;
    }
    .hero-amount {
        font-size: 2.1rem;
        font-weight: 700;
        color: #38BDF8;
        direction: ltr;
        margin-bottom: 10px;
    }
    .hero-stats {
        display: flex;
        justify-content: space-between;
        border-top: 1px solid #334155;
        padding-top: 10px;
        font-size: 0.72rem;
    }
    .hero-stat-val {
        font-weight: 600;
        color: #F1F5F9;
        display: block;
        margin-top: 2px;
    }

    /* כרטיסייה ראשית לקבוצות */
    .group-card {
        background-color: #1E293B;
        border-radius: 12px;
        padding: 12px 16px;
        margin-bottom: 10px;
        border: 1px solid #334155;
    }
    .group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
    }
    .group-title {
        font-weight: 600;
        font-size: 0.95rem;
        color: #F8FAFC;
    }
    .group-amounts {
        font-size: 0.85rem;
        direction: ltr;
        color: #38BDF8;
        font-weight: 700;
    }

    /* פריט בודד בתוך פירוט */
    .item-row {
        background-color: #0F172A;
        border-radius: 8px;
        padding: 8px 12px;
        margin-bottom: 6px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 1px solid #334155;
    }

    div[data-testid="stPopover"] > button {
        padding: 2px 8px !important;
        font-size: 0.7rem !important;
        min-height: 0px !important;
        height: 26px !important;
        border-radius: 6px !important;
        background-color: #334155 !important;
        color: #38BDF8 !important;
        border: 1px solid #475569 !important;
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

# לוגיקת מחזור מדויקת (10 עד 9)
def get_billing_cycle(dt):
    if pd.isna(dt): 
        dt = datetime.now()
    if dt.day >= 10:
        start = dt.replace(day=10)
        end = dt.replace(year=dt.year + 1, month=1, day=9) if dt.month == 12 else dt.replace(month=dt.month + 1, day=9)
    else:
        end = dt.replace(day=9)
        start = dt.replace(year=dt.year - 1, month=12, day=10) if dt.month == 1 else dt.replace(month=dt.month - 1, day=10)
    return f"{start.strftime('%d/%m/%Y')} - {end.strftime('%d/%m/%Y')}"

today_cycle = get_billing_cycle(datetime.now())

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

    df['מחזור'] = df['parsed_date'].apply(get_billing_cycle)
    
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

expected_fixed_expenses = {
    "שכירות / משכנתא": 4500.0,
    "סולמייט (חיות)": 857.0,
    "עירית בני ברק": 541.6,
    "חשמל": 350.0,
    "אינטרנט וטלפון": 150.0
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
        <div>הכנסה<span class="hero-stat-val">₪{estimated_income:,.0f}</span></div>
        <div>משתנות<span class="hero-stat-val">₪{total_variable:,.0f}</span></div>
        <div>קבועות שירדו<span class="hero-stat-val">₪{total_fixed_paid:,.0f}</span></div>
        <div>משוריין בקנה<span class="hero-stat-val" style="color:#FB923C;">₪{unpaid_fixed_total:,.0f}</span></div>
    </div>
</div>
""", unsafe_allow_html=True)

# --- 2. כפתור הוספת עסקה מהירה ---
with st.expander("➕ הוסף עסקה חדשה למחזור"):
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

# --- 3. בלוק קבועות בסגנון RiseUp (עם פסי התקדמות) ---
total_expected_fixed = sum(expected_fixed_expenses.values())
fixed_progress = min(1.0, total_fixed_paid / total_expected_fixed) if total_expected_fixed > 0 else 0

st.markdown(f"""
<div class="group-card">
    <div class="group-header">
        <span class="group-title">📌 התחייבויות קבועות</span>
        <span class="group-amounts">₪{total_fixed_paid:,.0f} / ₪{total_expected_fixed:,.0f}</span>
    </div>
</div>
""", unsafe_allow_html=True)
st.progress(fixed_progress)

# פירוט הקבועות באקורדיון נקי
with st.expander("🔍 פירוט הוצאות קבועות ועדכון סטטוס"):
    for item_name, exp_amount in expected_fixed_expenses.items():
        is_paid = item_name not in unpaid_fixed_dict
        if is_paid:
            actual_row = fixed_paid_df[fixed_paid_df[name_col].astype(str).str.contains(item_name, na=False)]
            amt = actual_row[amount_col].values[0] if not actual_row.empty else exp_amount
            st.markdown(f"""
            <div class="item-row">
                <div>🟢 {item_name} <span style="font-size:0.75rem; color:#4ADE80;">(ירד)</span></div>
                <div style="font-weight:700; direction:ltr;">₪{amt:,.1f}</div>
            </div>
            """, unsafe_allow_html=True)
        else:
            col_inf, col_btn = st.columns([3, 1])
            with col_inf:
                st.markdown(f"""
                <div style="padding-top:4px;">
                    🟠 {item_name} <span style="font-size:0.75rem; color:#FB923C;">(צפוי: ₪{exp_amount:,.1f})</span>
                </div>
                """, unsafe_allow_html=True)
            with col_btn:
                with st.popover("שנה&סמן"):
                    new_amt = st.number_input("סכום בפועל", value=float(exp_amount), key=f"p_{item_name}")
                    if st.button("אישור", key=f"b_{item_name}"):
                        st.session_state.added_transactions.append({
                            date_col: datetime.now().strftime('%Y-%m-%d'),
                            name_col: item_name,
                            amount_col: new_amt,
                            type_col: "קבוע",
                            cat_col: "חשבונות ודירה"
                        })
                        st.rerun()

st.divider()

# --- 4. בלוק הוצאות משתנות בסגנון RiseUp ---
st.markdown(f"""
<div class="group-card">
    <div class="group-header">
        <span class="group-title">🛍️ הוצאות משתנות (שוטפות)</span>
        <span class="group-amounts">סה"כ: ₪{total_variable:,.0f}</span>
    </div>
</div>
""", unsafe_allow_html=True)

# פירוט עסקאות משתנות באקורדיון
with st.expander("🔍 פירוט עסקאות משתנות אחרונות"):
    if not variable_df.empty:
        for _, row in variable_df.tail(10).iterrows():
            t_date = pd.to_datetime(row['parsed_date']).strftime('%d/%m') if pd.notna(row['parsed_date']) else ""
            c_name = str(row[name_col])
            c_cat = str(row.get(cat_col, 'משתנה'))
            amt_val = float(row[amount_col])
            
            st.markdown(f"""
            <div class="item-row">
                <div>
                    <div>{c_name}</div>
                    <div style="font-size:0.72rem; color:#94A3B8;">{t_date} • {c_cat}</div>
                </div>
                <div style="font-weight:700; direction:ltr;">₪{amt_val:,.1f}</div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("אין עסקאות משתנות במחזור זה.")
