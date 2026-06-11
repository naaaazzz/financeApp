export function formatINR(amount: number): string {
  try {
    return (
      "₹" +
      amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  } catch (e) {
    return "₹" + amount.toFixed(2);
  }
}

export default formatINR;
