"""
Professional Streamlit Dashboard
Single-file Streamlit app that shows a polished, production-ready dashboard with many visualizations.
Features:
- Upload your own CSV or use sample datasets (Iris + Tips + Random time series)
- Sidebar controls and filters
- KPI cards, summary stats
- Interactive charts: Plotly, Altair, Matplotlib/Seaborn
- Correlation heatmap, PCA projection, pairwise scatter matrix
- Geographic map (pydeck)
- Data download

How to run:
1. Install dependencies:
   pip install streamlit pandas numpy plotly altair seaborn scikit-learn pydeck matplotlib
2. Run:
   streamlit run Professional_Streamlit_Dashboard.py

Note: This is a single-file example intended for extension. Replace sample data with your CSV upload.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import altair as alt
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import pydeck as pdk
import io

st.set_page_config(
    page_title="Professional Data Explorer",
    layout="wide",
    initial_sidebar_state="expanded"
)

# -------------------- Helpers --------------------
@st.cache_data
def load_iris():
    from sklearn.datasets import load_iris
    data = load_iris(as_frame=True)
    df = data.frame
    df.columns = list(df.columns)
    df['target_name'] = [data.target_names[t] for t in data.target]
    return df

@st.cache_data
def load_tips():
    try:
        import seaborn as sns
        return sns.load_dataset('tips')
    except Exception:
        # fallback synthetic
        df = pd.DataFrame({
            'total_bill': np.random.gamma(2, 20, 244),
            'tip': np.random.gamma(1, 3, 244),
            'sex': np.random.choice(['Male','Female'], 244),
            'smoker': np.random.choice(['Yes','No'], 244),
            'day': np.random.choice(['Thur','Fri','Sat','Sun'], 244),
            'time': np.random.choice(['Lunch','Dinner'], 244),
            'size': np.random.randint(1,7,244)
        })
        return df

@st.cache_data
def make_timeseries(n=365):
    rng = pd.date_range(end=pd.Timestamp.today(), periods=n, freq='D')
    df = pd.DataFrame({
        'date': rng,
        'value': (np.cumsum(np.random.randn(n)) + 50) * (1 + np.sin(np.linspace(0,6.28,n))/6)
    })
    return df

@st.cache_data
def sample_geo(n=200):
    # random points around a center (latitude, longitude)
    center = (28.6139, 77.2090)  # New Delhi center for example
    lat = center[0] + np.random.normal(scale=0.5, size=n)
    lon = center[1] + np.random.normal(scale=0.5, size=n)
    df = pd.DataFrame({'lat': lat, 'lon': lon, 'value': np.random.rand(n) * 100})
    return df


# -------------------- Sidebar --------------------
st.sidebar.title("Data & Controls")
st.sidebar.markdown("Upload a CSV or pick a sample dataset to explore.")
uploaded_file = st.sidebar.file_uploader("Upload CSV", type=['csv'])


if uploaded_file is not None:
    try:
        df = pd.read_csv(uploaded_file)
        st.sidebar.success("Loaded uploaded file")
    except Exception as e:
        st.sidebar.error(f"Failed to read file: {e}")
        df = None
else:
    df = None


# -------------------- Header / KPIs --------------------
st.title("Professional Streamlit Data Explorer")
st.markdown("A polished dashboard showing many visualization techniques — interactive, exportable, and extensible.")

if df is None:
    st.info("No data selected yet — choose a sample dataset or upload a CSV from the sidebar.")
    st.stop()

# Show first rows and basic metrics
with st.expander("Preview & Basic Info", expanded=True):
    st.dataframe(df.head(10))
    st.markdown(f"**Rows:** {df.shape[0]} — **Columns:** {df.shape[1]}")
    st.write(df.dtypes)

# Numeric & categorical automatic detection
numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
cat_cols = df.select_dtypes(include=['object','category','bool']).columns.tolist()

def kpi_row(values, labels):
    cols = st.columns(len(values))
    for c, v, l in zip(cols, values, labels):
        c.metric(label=l, value=v)

# Compute KPIs
n_rows = df.shape[0]
missing_pct = f"{df.isna().mean().mean()*100:.2f}%"
memory = f"{df.memory_usage(deep=True).sum()/1024**2:.2f} MB"

kpi_row([n_rows, missing_pct, memory], ["Rows", "Avg missing %", "Memory usage"]) 

# -------------------- Filters --------------------
st.sidebar.markdown("---")
st.sidebar.header("Filters")
filter_widget = {}
if cat_cols:
    for c in cat_cols[:5]:
        vals = df[c].dropna().unique().tolist()
        sel = st.sidebar.multiselect(f"Filter {c}", options=vals, default=vals)
        filter_widget[c] = sel
if numeric_cols:
    for c in numeric_cols[:5]:
        lo, hi = float(df[c].min()), float(df[c].max())
        r = st.sidebar.slider(f"Range {c}", min_value=lo, max_value=hi, value=(lo, hi))
        filter_widget[c] = r

# apply filters (best effort)
df_filtered = df.copy()
for col, sel in filter_widget.items():
    if col in cat_cols:
        df_filtered = df_filtered[df_filtered[col].isin(sel)]
    elif col in numeric_cols and isinstance(sel, tuple):
        df_filtered = df_filtered[df_filtered[col].between(sel[0], sel[1])]

st.markdown(f"**Filtered rows:** {df_filtered.shape[0]}")

# -------------------- Layout: 2-column top --------------------
left, right = st.columns([2,3])

with left:
    st.subheader("Distribution & Summary")
    if numeric_cols:
        col = st.selectbox("Select numeric for distribution", numeric_cols, index=0)
        # Histogram + boxplot (matplotlib/seaborn)
        fig, ax = plt.subplots(2,1, figsize=(6,5), constrained_layout=True)
        sns.histplot(df_filtered[col].dropna(), ax=ax[0], kde=True)
        ax[0].set_title(f'Histogram of {col}')
        sns.boxplot(x=df_filtered[col].dropna(), ax=ax[1])
        ax[1].set_title(f'Boxplot of {col}')
        st.pyplot(fig)
    else:
        st.info("No numeric columns to show distributions.")

    # Correlation heatmap (if enough numeric columns)
    if len(numeric_cols) >= 2:
        st.subheader("Correlation heatmap")
        corr = df_filtered[numeric_cols].corr()
        fig, ax = plt.subplots(figsize=(6,5))
        sns.heatmap(corr, annot=True, fmt='.2f', cmap='vlag', ax=ax)
        st.pyplot(fig)

with right:
    st.subheader("Interactive scatter & pairwise")
    if len(numeric_cols) >= 2:
        x = st.selectbox("X axis", numeric_cols, index=0, key='x')
        y = st.selectbox("Y axis", numeric_cols, index=1, key='y')
        color = st.selectbox("Color (optional)", [None] + cat_cols + numeric_cols)
        fig = px.scatter(df_filtered, x=x, y=y, color=color, hover_data=df_filtered.columns.tolist(), title=f"{y} vs {x}")
        st.plotly_chart(fig, use_container_width=True)

    # Pairwise matrix using Plotly
    if len(numeric_cols) >= 3:
        st.markdown("**Pairwise scatter matrix**")
        fig2 = px.scatter_matrix(df_filtered[numeric_cols].dropna().sample(min(400, len(df_filtered))))
        fig2.update_layout(height=600)
        st.plotly_chart(fig2, use_container_width=True)

# -------------------- PCA Projection --------------------
if len(numeric_cols) >= 2:
    st.header("Dimensionality reduction — PCA (2 components)")
    n_sample = min(2000, df_filtered.shape[0])
    X = df_filtered[numeric_cols].dropna()
    Xs = X.sample(n_sample) if X.shape[0] > n_sample else X
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(Xs)
    pca = PCA(n_components=2)
    proj = pca.fit_transform(X_scaled)
    pca_df = pd.DataFrame(proj, columns=['PC1','PC2'])
    # attach a label if a categorical exists
    if cat_cols:
        pca_df['label'] = df_filtered.dropna(subset=numeric_cols).loc[Xs.index, cat_cols[0]].astype(str).values
    fig = px.scatter(pca_df, x='PC1', y='PC2', color='label' if 'label' in pca_df else None, title='PCA (2D)')
    st.plotly_chart(fig, use_container_width=True)

# -------------------- Time Series Section --------------------
if 'date' in df_filtered.columns or np.issubdtype(df_filtered.index.dtype, np.datetime64):
    st.header("Time Series")
    if 'date' not in df_filtered.columns:
        ts = df_filtered.copy()
        ts['date'] = pd.to_datetime(ts.index)
    else:
        ts = df_filtered.copy()
        ts['date'] = pd.to_datetime(ts['date'])
    numeric_for_ts = [c for c in ts.select_dtypes(include=[np.number]).columns]
    if numeric_for_ts:
        col_ts = st.selectbox("Value for time series", numeric_for_ts)
        agg = st.selectbox("Aggregation", ['mean','sum','median'])
        ts_agg = ts.groupby('date')[col_ts].agg(agg).reset_index()
        fig = px.line(ts_agg, x='date', y=col_ts, title=f"{agg} of {col_ts} over time")
        st.plotly_chart(fig, use_container_width=True)

# -------------------- Altair example: stacked bar --------------------
st.header("Altair — Categorical stacking")
if cat_cols and numeric_cols:
    cat = cat_cols[0]
    val = numeric_cols[0]
    sample = df_filtered[[cat, val]].dropna().sample(min(1000, df_filtered.shape[0]))
    alt_chart = alt.Chart(sample).mark_bar().encode(
        x=alt.X(f'{cat}:N', sort='-y'),
        y=alt.Y(f'mean({val}):Q'),
        color=alt.Color(f'{cat}:N')
    ).properties(width=600, height=300)
    st.altair_chart(alt_chart, use_container_width=True)
else:
    st.info("Not enough categorical+numeric columns for Altair stacked example.")

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, ConfusionMatrixDisplay

# -------------------- ML Evaluation --------------------
st.header("Model Evaluation - Accuracy")

import xgboost as xgb
import shap
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, ConfusionMatrixDisplay

target_col = "Risk_Level_Assessed"

if target_col in df.columns:
    try:
        # --- Preprocess ---
        X = df.drop(['Risk_Level_Assessed', 'Name', 'Underwriter_ID'], axis=1, errors="ignore")
        y = df[target_col]

        # One-hot encode categoricals
        cat_cols_for_encoding = ['Insurance_Type', 'State', 'Certifications']
        for c in cat_cols_for_encoding:
            if c in X.columns:
                X = pd.get_dummies(X, columns=[c], drop_first=True)
        st.subheader("Class distribution in dataset")
        st.bar_chart(y.value_counts())
        # Encode target
        le = LabelEncoder()
        y = le.fit_transform(y)

        # --- Split ---
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # --- Train XGBoost ---
        model = xgb.XGBClassifier(
            objective='multi:softprob',
            n_estimators=100,
            learning_rate=0.1,
            use_label_encoder=False,
            eval_metric='mlogloss'
        )
        model.fit(X_train, y_train)
        

        
        # --- Evaluate ---
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        st.metric("Accuracy", f"{acc:.2%}")



    except Exception as e:
        st.error(f"Could not train XGBoost model: {e}")
else:
    st.warning(f"Target column '{target_col}' not found in dataset.")




# -------------------- Download filtered data --------------------
st.header("Export")
csv = df_filtered.to_csv(index=False)
st.download_button(
    "Download filtered CSV",
    data=csv,
    file_name="filtered_data.csv",
    mime="text/csv"
)


# -------------------- Appendix / Advanced --------------------
st.markdown("---")
st.sidebar.markdown("---")
st.sidebar.write("Tip: For production, separate code modules, enable logging, and add authentication + automated tests.")



st.markdown("Built by Stellars — customize this file to fit your data and style guide.")
