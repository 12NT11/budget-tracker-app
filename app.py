import streamlit as st
import pandas as pd

st.set_page_config(page_title="ניהול תקציב אישי", layout="centered")

st.title("💰 מערכת ניהול תקציב חכמה")

# טעינת הנתונים מ-Google Sheets
@st.cache_data(ttl=600)
def load_data():
    try:
        conn = st.connection("gsheets", type="gsheets")
        df = conn.read(worksheet="Sheet1", ttl=5)
        return df
    except Exception as e:
        st.error(f"שגיאה בחיבור לגיליון: {e}")
        return pd.DataFrame()

df = load_data()

# הגדרת משתני בסיס
estimated_income = 17750
total_fixed = 0.0
total_variable = 0.0

# בדיקת עמודות מול הכותרות החדשות שהגדרת בגיליון
amount_col = 'סכום' if 'סכום' in df.columns else None
type_col = 'סוג הוצאה' if 'סוג הוצאה' in df.columns else None
name_col = 'שם עסק' if 'שם עסק' in df.columns else None

if amount_col and type_col:
    # המרת עמודת הסכום למספרים
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
            cols = st.columns([2, 1])
            cols.write(f"**{row['name']}** (₪{row['total_amount']:,.2f})")
            cols.caption(f"{row['count']} עסקאות")
    else:
        st.warning("לא נמצאו עמודות מתאימות בגיליון. ודא שהכותרות הן: תאריך, סכום, שם עסק, סוג הוצאה, קטגוריה, הערות.")

with tab3:
    st.subheader("רשימת עסקאות מלאה")
    st.dataframe(df, use_container_width=True)