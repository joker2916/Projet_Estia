function PageHeader({ title, subtitle }) {
  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>{title}</h1>
      {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
    </div>
  );
}

const containerStyle = {
  marginBottom: "15px",
};

const titleStyle = {
  margin: 0,
  color: "#1976d2",
};

const subtitleStyle = {
  marginTop: "8px",
  color: "#666",
};

export default PageHeader;
