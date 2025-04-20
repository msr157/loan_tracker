/**
 * Format a number as Indian currency (INR)
 */
export const formatCurrency = (amount: number): string => {
  // Convert the number to Indian format (with commas at thousands, lakhs, crores)
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return formatter.format(amount);
};

/**
 * Format a percentage to display with required decimal places
 */
export const formatPercentage = (value: number, decimalPlaces: number = 2): string => {
  return `${value.toFixed(decimalPlaces)}%`;
};

/**
 * Format a duration in months to a readable string (years and months)
 */
export const formatDuration = (months: number): string => {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years === 0) {
    return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  } else if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  } else {
    return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  }
};

/**
 * Format a date string to display in a readable format
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Calculate the number of months between two dates
 */
export const monthsBetweenDates = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
};

/**
 * Format progress percentage
 */
export const formatProgress = (percentage: number): string => {
  return `${Math.round(percentage)}% complete`;
};
