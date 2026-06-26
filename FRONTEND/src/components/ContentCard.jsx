function ContentCard({ children, padding = "15px", style = {} }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "10px",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default ContentCard;