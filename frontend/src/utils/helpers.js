export const formatCurrency = (amt) => '₹' + Number(amt).toFixed(2);
export const formatDate = (dateString) => new Date(dateString).toLocaleDateString();