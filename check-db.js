function addMonths(date, months) {
  const d = new Date(date);
  const originalDay = date.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== originalDay) {
    d.setDate(0);
  }
  return d;
}
function getCompletedBillingMonths(admissionDateStr, currentDate = new Date()) {
  const admissionDate = new Date(admissionDateStr);
  admissionDate.setHours(0, 0, 0, 0);
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);
  const completedMonths = [];
  let i = 1;
  while (true) {
    const completionDate = addMonths(admissionDate, i);
    completionDate.setHours(0, 0, 0, 0);
    if (completionDate > today) break;
    const dueMonthDate = addMonths(admissionDate, i - 1);
    const monthName = dueMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const dueDateStr = completionDate.toISOString().split('T')[0];
    completedMonths.push({ monthName, dueDate: dueDateStr });
    i++;
    if (i > 1200) break;
  }
  return completedMonths;
}
console.log(getCompletedBillingMonths('2026-04-15', new Date('2026-09-09')));
