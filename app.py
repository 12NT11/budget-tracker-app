import streamlit as st
import pandas as pd

st.set_page_config(page_title="ניהול תקציב אישי", layout="centered")

st.title("💰 מערכת ניהול תקציב חכמה")

# טעינת הנתונים הישירה מ-Google Sheets (ללא מפתחות וללא סיבוכים!)
@st.cache_data(ttl=600)
def load_data():
    try:
        # Streamlit מתחבר אוטומטית לגיליון דרך הכתובת
        conn = st.connection("gsheets", type="gsheets")
        df = conn.read(worksheet="Sheet1", ttl=5)
        return df
    except Exception as e:
        # גיבוי מקומי אם הקישור עדיין לא הוגדר ב-Streamlit Secrets
        return pd.DataFrame([
            {"תאריך": "2026-07-15", "שם עסק": "סולמייט", "סכום": 857.0, "סוג הוצאה": "קבוע", "קטגוריה": "חיות מחמד"},
            {"תאריך": "2026-07-18", "שם עסק": "עירית בני ברק", "סכום": 541.6, "סוג הוצאה": "קבוע", "קטגוריה": "חשבונות ודירה"},
            {"תאריך": "2026-07-20", "שם עסק": "אושר עד בני ברק", "סכום": 338.8, "סוג הוצאה": "קבוע", "קטגוריה": "סופר ופארם"}
        ])

df = load_data()

# טאבים נוחים לנייד
tab1, tab2, tab3 = st.tabs(["📊 דאשבורד חודשי", "🏢 ניהול בתי עסק", "💳 כל העסקאות"])

with tab1:
    st.subheader("מעקב תקציב חודשי")
    
    if 'סכום' in df.columns and 'סוג הוצאה' in df.columns:
        total_fixed = df[df['סוג הוצאה'] == 'קבוע']['סכום'].sum()
        total_variable = df[df['סוג הוצאה'] == 'משתנה']['סכום'].sum()
        total_expenses = total_fixed + total_variable
        estimated_income = 17750
        remaining = estimated_income - total_expenses

        col1, col2 = st.columns(2)
        col1.metric("הוצאות קבועות", f"₪{total_fixed:,.2f}")
        col2.metric("הוצאות משתנות", f"₪{total_variable:,.2f}")
        
        st.info(f"💵 **הכנסה משוערת:** ₪{estimatedIncome:,.2f} | **סך הוצאות:** ₪{total_expenses:,.2f}")
        st.success(f"💎 **יתרה פנויה למעקב:** ₪{remaining:,.2f}")
    else:
        st.write("נא לוודא ששמות העמודות בגיליון תואמים (תאריך, שם עסק, סכום, סוג הוצאה, קטגוריה).")

with tab2:
    st.subheader("קיבוץ וניהול בתי עסק")
    if 'שם עסק' in df.columns:
        businesses = df.groupby('שם עסק').agg({'סכום': ['sum', 'count'], 'סוג הוצאה': 'first'}).reset_index()
        businesses.columns = ['name', 'total_amount', 'count', 'type']

        for index, row in businesses.iterrows():
            cols = st.columns([2, 1])
            cols.write(f"**{row['name']}** (₪{row['total_amount']:,.2f})")
            cols.caption(f"סוג נוכחי: {row['type']} ({row['count']} עסקאות)")

with tab3:
    st.subheader("רשימת עסקאות מלאה")
    st.dataframe(df, use_container_width=True)