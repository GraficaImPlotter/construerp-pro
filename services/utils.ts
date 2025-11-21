
export const exportToCSV = (data: any[], headers: string[], filename: string) => {
  if (!data || !data.length) {
    alert("Não há dados para exportar.");
    return;
  }

  // Convert data to CSV format
  const csvContent = [
    headers.join(';'), // Header row
    ...data.map(row => {
      return Object.values(row).map(value => {
        // Handle strings with commas or quotes
        const stringValue = String(value !== null && value !== undefined ? value : '');
        if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(';');
    })
  ].join('\n');

  // Create a Blob with UTF-8 BOM for Excel compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Sanitizes a payload object by converting empty strings to null
 * and ensuring numbers are strictly numbers.
 * Essential for Supabase UUID and Numeric fields.
 */
export const sanitizePayload = (payload: Record<string, any>) => {
  const clean: Record<string, any> = {};
  
  Object.keys(payload).forEach(key => {
    const value = payload[key];
    
    if (value === '' || value === undefined) {
      clean[key] = null;
    } else if (typeof value === 'string' && value.trim() === '') {
      clean[key] = null;
    } else {
      clean[key] = value;
    }
  });

  return clean;
};
