import streamlit as st
import pandas as pd
from datetime import datetime

st.set_page_config(page_title="ניהול תקציב אישי", layout="centered")

st.title("💰 ניהול תקציב אישי")

# טעינת נתונים
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

df = load_data()

# ניקוי והמרת נתונים
if not df.empty:
    amount_col = next((col for col in df.columns if 'סכום' in col), 'סכום')
    type_col = next((col for col in df.columns if 'סוג' in col), 'סוג הוצאה')
    name_col = next((col for col in df.columns if 'עסק' in col), 'שם עסק')
    date_col = next((col for col in df.columns if 'תאריך' in col), 'תאריך')
    cat_col = next((col for col in df.columns if 'קטגוריה' in col), 'קטגוריה')

    df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce').fillna(0)
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    
    # הוספת עמודת חודש לסינון
    df['חודש'] = df[date_col].dt.strftime('%Y-%m')

    # סינון לפי חודש
    available_months = sorted(df['חודש'].dropna().unique(), reverse=True)
    selected_month = st.sidebar.selectbox("📅 בחר חודש לתצוגה:", available_months if available_months else ["הכל"])

    if selected_month != "הכל":
        filtered_df = df[df['חודש'] == selected_month]
    else:
        filtered_df = df
else:
    filtered_df = df
    amount_col, type_col, name_col, date_col, cat_col = 'סכום', 'סוג הוצאה', 'שם עסק', 'תאריך', 'קטגוריה'

# חישוב סכומים
estimated_income = 17750
total_fixed = filtered_df[filtered_df[type_col].astype(str).str.contains('קבוע', na=False)][amount_col].sum() if not filtered_df.empty else 0.0
total_variable = filtered_df[filtered_df[type_col].astype(str).str.contains('משתנה', na=False)][amount_col].sum() if not filtered_df.empty else 0.0
total_expenses = total_fixed + total_variable
remaining = estimated_income - total_expenses

# טאבים
tab1, tab2, tab3 = st.tabs(["📊 דאשבורד", "🏢 ניהול עסקים", "💳 עסקאות"])

with tab1:
    st.subheader(f"סיכום עבור: {selected_month if 'selected_month' in locals() else 'הכל'}")
    
    col1, col2 = st.columns(2)
    col1.metric("הוצאות קבועות", f"₪{total_fixed:,.2f}")
    col2.metric("הוצאות משתנות", f"₪{total_variable:,.2f}")
    
    st.info(f"💵 **הכנסה משוערת:** ₪{estimated_income:,.2f} | **סך הוצאות:** ₪{total_expenses:,.2f}")
    st.success(f"💎 **יתרה פנויה למעקב:** ₪{remaining:,.2f}")

    # התפלגות לפי קטגוריה
    if not filtered_df.empty and cat_col in filtered_df.columns:
        st.subheader("📌 הוצאות לפי קטגוריה")
        cat_summary = filtered_df.groupby(cat_col)[amount_col].sum().sort_values(ascending=False)
        st.bar_chart(cat_summary)

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
    st.dataframe(filtered_df, use_container_width=True)