import streamlit as st
import pandas as pd

st.set_page_config(page_title="ניהול תקציב אישי", layout="centered")

st.title("💰 מערכת ניהול תקציב חכמה")

# טעינת הנתונים מ-Google Sheets
@st.cache_data(ttl=600)
def load_data():
    try:
        sheet_url = st.secrets["connections"]["gsheets"]["spreadsheet"]
        if "/edit" in sheet_url:
            csv_url = sheet_url.split("/edit")[0] + "/export?format=csv"
        else:
            csv_url = sheet_url
            
        df = pd.read_csv(csv_url)
        return df
    except Exception as e:
        return pd.DataFrame()

df = load_data()

# הצגת העמודות שזוהו בראש הדף כדי שנראה בדיוק מה השמות
st.sidebar.write("עמודות שזוהו בגיליון:", list(df.columns))

# הגדרת משתני בסיס
estimated_income = 17750
total_fixed = 0.0
total_variable = 0.0

# זיהוי חכם של עמודות הסכום וסוג ההוצאה (מתעלם מרווחים ואותיות קטנות/גדולות)
df.columns = df.columns.str.strip() # מנקה רווחים מיותרים מהכותרות

amount_col = next((col for col in df.columns if 'סכום' in col or 'amount' in col.lower()), None)
type_col = next((col for col in df.columns if 'סוג' in col or 'type' in col.lower()), None)
name_col = next((col for col in df.columns if 'עסק' in col or 'name' in col.lower()), None)

if amount_col and type_col:
    df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce').fillna(0)
    total_fixed = df[df[type_col].astype(str).str.contains('קבוע', na=False)][amount_col].sum()
    total_variable = df[df[type_col].astype(str).str.contains('משתנה', na=False)][amount_col].sum()

total_expenses = total_fixed + total_variable
remaining = estimated_income - total_expenses

# טאבים לאפליקציה
tab1, tab2, tab3 = st.tabs(["📊 דאשבורד חודשי", "🏢 ניהול בתי עסק", "💳 כל העסקאות"])

with tab1:
    st.subheader("מעקב תקציב חודשי")
    
    col1, col2 = st.columns(2)
    col1.metric("הוצאות קבועות", f"₪{total_fixed:,.2f}")
    col2.metric("הוצאות משתנות", f"₪{total_variable:,.2f}")
    
    st.info(f"💵 **הכנסה משוערת:** ₪{estimated_income:,.2f} | **סך הוצאות:** ₪{total_expenses:,.2f}")
    st.success(f"💎 **יתרה פנויה למעקב:** ₪{remaining:,.2f}")

with tab2:
    st.subheader("קיבוץ וניהול בתי עסק")
    if name_col and amount_col:
        businesses = df.groupby(name_col).agg({amount_col: ['sum', 'count']}).reset_index()
        businesses.columns = ['name', 'total_amount', 'count']

        for index, row in businesses.iterrows():
            col1, col2 = st.columns([3, 1])
            col1.write(f"**{row['name']}** (₪{row['total_amount']:,.2f})")
            col2.caption(f"{row['count']} עסקאות")
    else:
        st.warning("לא נמצאו עמודות מתאימות בגיליון.")

with tab3:
    st.subheader("רשימת עסקאות מלאה")
    st.dataframe(df, use_container_width=True)