import streamlit as st
import pandas as pd
from datetime import datetime

st.set_page_config(page_title="ניהול תקציב חכם", layout="centered")

st.title("💰 מערכת ניהול תקציב חכמה")

# אתחול זיכרון מקומי לעסקאות חדשות שנוספו מהאפליקציה
if 'added_transactions' not in st.session_state:
    st.session_state.added_transactions = []

# טעינת נתונים מ-Google Sheets
@st.cache_data(ttl=60)
def load_data():
    try:
        sheet_url = st.secrets["connections"]["gsheets"]["spreadsheet"]
        if "/edit" in sheet_url:
            csv_url = sheet_url.split("/edit")[0] + "/export?format=csv"
        else:
            csv_url = sheet_url
            
        df = pd.read_csv(csv_url)
        df.columns = df.columns.str.strip()
        return df
    except Exception as e:
        return pd.DataFrame()

base_df = load_data()

# מיזוג הנתונים מהגיליון עם העסקאות החדשות שהוזנו מהאפליקציה בזיכרון
if st.session_state.added_transactions:
    new_df = pd.DataFrame(st.session_state.added_transactions)
    if not base_df.empty:
        df = pd.concat([base_df, new_df], ignore_index=True)
    else:
        df = new_df
else:
    df = base_df

if not df.empty:
    amount_col = next((col for col in df.columns if 'סכום' in col), 'סכום')
    type_col = next((col for col in df.columns if 'סוג' in col), 'סוג הוצאה')
    name_col = next((col for col in df.columns if 'עסק' in col), 'שם עסק')
    date_col = next((col for col in df.columns if 'תאריך' in col), 'תאריך')
    cat_col = next((col for col in df.columns if 'קטגוריה' in col), 'קטגוריה')

    df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce').fillna(0)
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    df['חודש'] = df[date_col].dt.strftime('%Y-%m')

    current_month_str = datetime.now().strftime('%Y-%m')
    available_months = sorted(df['חודש'].dropna().unique(), reverse=True)
    if current_month_str not in available_months:
        available_months.insert(0, current_month_str)
        
    selected_month = st.sidebar.selectbox("📅 בחר חודש לתצוגה:", available_months, index=0)
    filtered_df = df[df['חודש'] == selected_month] if selected_month else df
else:
    filtered_df = pd.DataFrame()
    amount_col, type_col, name_col, date_col, cat_col = 'סכום', 'סוג הוצאה', 'שם עסק', 'תאריך', 'קטגוריה'
    selected_month = datetime.now().strftime('%Y-%m')

# --- תכונה 1: הגדרת הוצאות קבועות צפויות לחודש (שטרם ירדו) ---
# אפשר לעדכן כאן את ההוצאות הקבועות הקבועות שלך
expected_fixed_expenses = {
    "שכירות / משכנתא": 4500,
    "ארנונה": 541.6,
    "חשמל": 350,
    "אינטרנט וטלפון": 150,
    "חיות מחמד (מזון קבוע)": 300
}

# --- תכונה 2: טופס הזנה מהיר בסרגל הצד ---
st.sidebar.divider()
st.sidebar.subheader("➕ הוספת עסקה מהيرة")
with st.sidebar.form("quick_add_form"):
    q_date = st.date_input("תאריך", value=datetime.now())
    q_name = st.text_input("שם עסק")
    q_amount = st.number_input("סכום (₪)", min_value=0.0, step=10.0)
    q_type = st.selectbox("סוג הוצאה", ["משתנה", "קבוע"])
    q_cat = st.selectbox("קטגוריה", ["סופר ופארם", "רכב ותחבורה", "בילויים ומסעדות", "חשבונות ודירה", "חיות מחמד", "שונות"])
    
    submitted = st.form_submit_button("שמור עסקה")
    if submitted and q_name and q_amount > 0:
        new_row = {
            date_col: pd.to_datetime(q_date),
            name_col: q_name,
            amount_col: q_amount,
            type_col: q_type,
            cat_col: q_cat,
            'חודש': q_date.strftime('%Y-%m')
        }
        st.session_state.added_transactions.append(new_row)
        st.sidebar.success("העסקה נוספה בהצלחה!")
        st.rerun()

# חישובים
estimated_income = 17750

if not filtered_df.empty:
    fixed_paid_df = filtered_df[filtered_df[type_col].astype(str).str.contains('קבוע', na=False)]
    variable_df = filtered_df[filtered_df[type_col].astype(str).str.contains('משתנה', na=False)]
    
    total_fixed_paid = fixed_paid_df[amount_col].sum()
    total_variable = variable_df[amount_col].sum()
else:
    total_fixed_paid = 0.0
    total_variable = 0.0
    fixed_paid_df = pd.DataFrame()
    variable_df = pd.DataFrame()

# חישוב קבועות צפויות שטרם ירדו
total_expected_fixed = sum(expected_fixed_expenses.values())
# אומדן של קבועות שטרם ירדו (ההפרש בין הצפוי למה ששולם בפועל, לא יורד מתחת ל-0)
unpaid_fixed_estimate = max(0, total_expected_fixed - total_fixed_paid)

total_expenses = total_fixed_paid + total_variable
true_remaining = estimated_income - total_expenses - unpaid_fixed_estimate

# טאבים
tab1, tab2, tab3 = st.tabs(["📊 דאשבורד חודשי", "🏢 ניהול עסקים", "💳 כל העסקאות"])

with tab1:
    st.subheader(f"מעקב חודש: {selected_month}")
    
    # מדדי תקציב
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("הכנסה משוערת", f"₪{estimated_income:,.2f}")
    col2.metric("הוצאות בפועל", f"₪{total_expenses:,.2f}")
    col3.metric("קבועות שטרם ירדו", f"~₪{unpaid_fixed_estimate:,.2f}")
    col4.metric("יתרה פנויה אמיתית", f"₪{true_remaining:,.2f}", delta=f"₪{true_remaining}" if true_remaining >= 0 else f"-₪{abs(true_remaining)}")

    if true_remaining >= 0:
        st.success("🎯 מצוין! אנחנו עומדים ביעד ובתוך התקציב כולל ההתחייבויות הקבועות.")
    else:
        st.warning("⚠️ שימו לב! היתרה הפנויה נכנסה למינוס ביחס להתחייבויות.")

    st.divider()

    # פירוט קבועות ומשתנות
    c_left, c_right = st.columns(2)
    
    with c_left:
        st.markdown("### 📌 הוצאות קבועות שירדו")
        if not fixed_paid_df.empty:
            st.dataframe(fixed_paid_df[[date_col, name_col, amount_col, cat_col]], use_container_width=True, hide_index=True)
            st.caption(f"סה״כ שירדו: **₪{total_fixed_paid:,.2f}**")
        else:
            st.info("אין עדיין הוצאות קבועות שרשומות לחודש זה.")

    with c_right:
        st.markdown("### 🛍️ הוצאות משתנות")
        if not variable_df.empty:
            st.dataframe(variable_df[[date_col, name_col, amount_col, cat_col]], use_container_width=True, hide_index=True)
            st.caption(f"סה״כ משתנות: **₪{total_variable:,.2f}**")
        else:
            st.info("אין הוצאות משתנות רשומות לחודש זה.")

    st.divider()

    # --- תכונה 3: תקציב קטגוריות והתראות חריגה ---
    st.subheader("🎯 מעקב יעדי תקציב לקטגוריות משתנות")
    category_budgets = {
        "סופר ופארם": 3500,
        "רכב ותחבורה": 1200,
        "בילויים ומסעדות": 1000,
        "שונות": 800
    }

    if not variable_df.empty and cat_col in variable_df.columns:
        cat_spend = variable_df.groupby(cat_col)[amount_col].sum()
        for cat, limit in category_budgets.items():
            spent = cat_spend.get(cat, 0.0)
            progress = min(float(spent / limit), 1.0) if limit > 0 else 0.0
            
            st.markdown(f"**{cat}**: הוצאת ₪{spent:,.0f} מתוך תקציב ₪{limit:,.0f}")
            st.progress(progress)
            if spent > limit:
                st.error(f"⚠️ חריגה בתקציב עבור {cat}!")
    else:
        st.info("אין מספיק נתוני הוצאות משתנות להצגת התקדמות הקטגוריות לחודש זה.")

with tab2:
    st.subheader("קיבוץ וניתוח בתי עסק")
    if not df.empty and name_col in df.columns:
        biz_summary = df.groupby(name_col).agg({
            amount_col: 'sum',
            type_col: 'first'
        }).reset_index().sort_values(by=amount_col, ascending=False)

        for _, row in biz_summary.iterrows():
            c1, c2 = st.columns([3, 1])
            c1.write(f"**{row[name_col]}** (₪{row[amount_col]:,.2f})")
            c2.caption(f"סוג: {row[type_col] if pd.notna(row[type_col]) else 'לא מוגדר'}")

with tab3:
    st.subheader("כל העסקאות")
    st.dataframe(df, use_container_width=True)