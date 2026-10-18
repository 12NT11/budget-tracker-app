import streamlit as st
import pandas as pd
from datetime import datetime, timedelta

st.set_page_config(page_title="ניהול תקציב חכם", layout="centered")

# עיצוב RTL ויישור מימין לשמאל
st.markdown(
    """
    <style>
    div.block-container {
        direction: rtl;
        text-align: right;
    }
    .stMetric {
        text-align: right;
    }
    div[data-testid="stExpander"] {
        direction: rtl;
        text-align: right;
    }
    </style>
    """,
    unsafe_allow_html=True
)

st.title("💰 ניהול תקציב אישי")

# אתחול זיכרון מקומי לעסקאות חדשות ולסיווגי עסקים
if 'added_transactions' not in st.session_state:
    st.session_state.added_transactions = []

if 'business_types' not in st.session_state:
    st.session_state.business_types = {
        "עירית בני ברק": "קבוע",
        "סולמייט": "קבוע",
        "שכירות": "קבוע",
        "חשמל": "קבוע",
        "אושר עד": "משתנה"
    }

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

# איחוד נתונים עם עסקאות שנוספו באפליקציה
if st.session_state.added_transactions:
    new_df = pd.DataFrame(st.session_state.added_transactions)
    if not base_df.empty:
        df = pd.concat([base_df, new_df], ignore_index=True)
    else:
        df = new_df
else:
    df = base_df

# זיהוי עמודות
if not df.empty:
    amount_col = next((col for col in df.columns if 'סכום' in col), 'סכום')
    type_col = next((col for col in df.columns if 'סוג' in col), 'סוג הוצאה')
    name_col = next((col for col in df.columns if 'עסק' in col), 'שם עסק')
    date_col = next((col for col in df.columns if 'תאריך' in col), 'תאריך')
    cat_col = next((col for col in df.columns if 'קטגוריה' in col), 'קטגוריה')

    df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce').fillna(0)
    df['parsed_date'] = pd.to_datetime(df[date_col], errors='coerce')
    
    # חישוב שיוך למחזור (מ-10 בחודש עד 9 בחודש העוקב)
    def get_billing_cycle(dt):
        if pd.isna(dt):
            return "לא ידוע"
        if dt.day >= 10:
            start = dt.replace(day=10)
            # חודש הבא
            if dt.month == 12:
                end = dt.replace(year=dt.year + 1, month=1, day=9)
            else:
                end = dt.replace(month=dt.month + 1, day=9)
        else:
            end = dt.replace(day=9)
            if dt.month == 1:
                start = dt.replace(year=dt.year - 1, month=12, day=10)
            else:
                start = dt.replace(month=dt.month - 1, day=10)
        return f"{start.strftime('%d/%m/%Y')} - {end.strftime('%d/%m/%Y')}"

    df['מחזור'] = df['parsed_date'].apply(get_billing_cycle)
    
    # עדכון סוג הוצאה לפי הגדרות עסקים שנשמרו
    for biz, b_type in st.session_state.business_types.items():
        mask = df[name_col].astype(str).str.contains(biz, na=False)
        df.loc[mask, type_col] = b_type

    available_cycles = sorted(df['מחזור'].dropna().unique(), reverse=True)
    selected_cycle = st.sidebar.selectbox("📅 בחר מחזור תקציב (10-9):", available_cycles if available_cycles else ["נוכחי"])
    filtered_df = df[df['מחזור'] == selected_cycle] if selected_cycle else df
else:
    filtered_df = pd.DataFrame()
    amount_col, type_col, name_col, date_col, cat_col = 'סכום', 'סוג הוצאה', 'שם עסק', 'תאריך', 'קטגוריה'
    selected_cycle = "10/10/2026 - 09/11/2026"

# רשימת הוצאות קבועות צפויות כברירת מחדל
expected_fixed_expenses = {
    "שכירות / משכנתא": 4500.0,
    "סולמייט": 857.0,
    "עירית בני ברק": 541.6,
    "חשמל": 350.0,
    "אינטרנט וטלפון": 150.0
}

# טופס להוספת עסקה מהירה בסרגל הצד
st.sidebar.divider()
st.sidebar.subheader("➕ הוספת עסקה מהירה")
with st.sidebar.form("quick_add_form"):
    q_date = st.date_input("תאריך", value=datetime.now())
    q_name = st.text_input("שם עסק")
    q_amount = st.number_input("סכום (₪)", min_value=0.0, step=10.0)
    q_type = st.selectbox("סוג הוצאה", ["משתנה", "קבוע"])
    q_cat = st.selectbox("קטגוריה", ["סופר ופארם", "רכב ותחבורה", "בילויים ומסעדות", "חשבונות ודירה", "חיות מחמד", "שונות"])
    
    submitted = st.form_submit_button("שמור עסקה")
    if submitted and q_name and q_amount > 0:
        new_row = {
            date_col: q_date.strftime('%Y-%m-%d'),
            name_col: q_name,
            amount_col: q_amount,
            type_col: q_type,
            cat_col: q_cat
        }
        st.session_state.added_transactions.append(new_row)
        st.sidebar.success("העסקה נוספה בהצלחה!")
        st.rerun()

# חישובים למחזור הנבחר
estimated_income = 17750.0

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

# מציאת קבועות שטרם ירדו
paid_names = fixed_paid_df[name_col].tolist() if not fixed_paid_df.empty else []
unpaid_fixed_dict = {}

for item_name, exp_amount in expected_fixed_expenses.items():
    # בדיקה אם קיים ייצוג בחיובים של החודש
    is_paid = any(p_name in item_name or item_name in str(p_name) for p_name in paid_names)
    if not is_paid:
        unpaid_fixed_dict[item_name] = exp_amount

unpaid_fixed_total = sum(unpaid_fixed_dict.values())
true_remaining = estimated_income - (total_fixed_paid + total_variable + unpaid_fixed_total)

# טאבים ראשיים
tab1, tab2, tab3 = st.tabs(["🏠 מסך בית", "🏢 סיווג בתי עסק", "💳 עסקאות המחזור"])

with tab1:
    st.caption(f"📅 מחזור תקציב פעיל: **{selected_cycle}**")
    
    # 1. כרטיסיית יתרה פנויה ראשית
    st.info(f"### 💎 יתרה פנויה להוצאות: **₪{true_remaining:,.2f}**")
    st.caption(f"הכנסה: ₪{estimated_income:,.2f} | משתנות: ₪{total_variable:,.2f} | קבועות שירדו: ₪{total_fixed_paid:,.2f} | משוריין בקנה: ₪{unpaid_fixed_total:,.2f}")

    st.divider()

    # 2. צ'קליסט הוצאות קבועות למחזור זה
    st.subheader("📌 הוצאות קבועות למחזור זה")
    
    for item_name, exp_amount in expected_fixed_expenses.items():
        is_paid = item_name not in unpaid_fixed_dict
        
        c1, c2, c3 = st.columns([2, 1, 1])
        if is_paid:
            # מציאת החיוב בפועל
            actual_row = fixed_paid_df[fixed_paid_df[name_col].astype(str).str.contains(item_name, na=False)]
            actual_amt = actual_row[amount_col].values[0] if not actual_row.empty else exp_amount
            actual_date = pd.to_datetime(actual_row['parsed_date'].values[0]).strftime('%d/%m') if not actual_row.empty else ""
            
            c1.write(f"🟢 **{item_name}**")
            c2.write(f"₪{actual_amt:,.2f}")
            c3.caption(f"ירד ב-{actual_date}" if actual_date else "ירד")
        else:
            c1.write(f"🟠 **{item_name}**")
            c2.write(f"~₪{exp_amount:,.2f}")
            with c3.popover("שנה&סמן"):
                st.write(f"**עדכון חיוב עבור: {item_name}**")
                new_amt = st.number_input("סכום בפועל (₪)", value=float(exp_amount), key=f"amt_{item_name}")
                pay_date = st.date_input("תאריך חיוב", value=datetime.now(), key=f"date_{item_name}")
                if st.button("אישור ועדכון", key=f"btn_{item_name}"):
                    st.session_state.added_transactions.append({
                        date_col: pay_date.strftime('%Y-%m-%d'),
                        name_col: item_name,
                        amount_col: new_amt,
                        type_col: "קבוע",
                        cat_col: "חשבונות ודירה"
                    })
                    st.success("עודכן!")
                    st.rerun()

    st.divider()

    # 3. עסקאות משתנות אחרונות
    st.subheader("🛍️ עסקאות משתנות במחזור זה")
    if not variable_df.empty:
        display_var_df = variable_df.copy()
        display_var_df['תאריך_נקי'] = display_var_df['parsed_date'].dt.strftime('%d/%m/%Y')
        st.dataframe(
            display_var_df[['תאריך_נקי', name_col, amount_col, cat_col]],
            use_container_width=True,
            hide_index=True
        )
    else:
        st.info("אין עדיין עסקאות משתנות רשומות למחזור זה.")

with tab2:
    st.subheader("🏢 הגדרת סיווג בתי עסק (קבוע / משתנה)")
    st.write("שנה את סוג ההוצאה עבור בית עסק כדי שהמערכת תסווג אותו אוטומטית בכל החיובים:")
    
    if not df.empty and name_col in df.columns:
        unique_biz = df[name_col].dropna().unique()
        for biz in unique_biz:
            col_a, col_b = st.columns([2, 1])
            col_a.write(f"**{biz}**")
            current_type = st.session_state.business_types.get(biz, "משתנה")
            new_type = col_b.selectbox("סוג", ["משתנה", "קבוע"], index=0 if current_type == "משתנה" else 1, key=f"biz_select_{biz}")
            if new_type != current_type:
                st.session_state.business_types[biz] = new_type
                st.rerun()

with tab3:
    st.subheader("💳 כל עסקאות המחזור")
    if not filtered_df.empty:
        display_all = filtered_df.copy()
        display_all['תאריך_נקי'] = display_all['parsed_date'].dt.strftime('%d/%m/%Y')
        st.dataframe(display_all[['תאריך_נקי', name_col, amount_col, type_col, cat_col]], use_container_width=True, hide_index=True)
    else:
        st.info("אין עסקאות להצגה למחזור זה.")
