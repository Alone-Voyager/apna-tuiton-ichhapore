/**
 * Utility functions for class ordering and sorting
 */

interface Class {
  id: string;
  name: string;
  monthly_fee: number;
  total_students: number;
  avg_attendance: number;
  fee_collection_rate: number;
}

// Standard class hierarchy for proper ordering
const standardClassOrder = [
  'nursery',
  'lkg', 'l.k.g', 'lower kg', 'lower kindergarten', "LKG",
  'ukg', 'u.k.g', 'upper kg', 'upper kindergarten','UKG',
  'prep', 'preparation',
  'class 1', '1st', 'first', 'std 1', 'grade 1',
  'class 2', '2nd', 'second', 'std 2', 'grade 2',
  'class 3', '3rd', 'third', 'std 3', 'grade 3',
  'class 4', '4th', 'fourth', 'std 4', 'grade 4',
  'class 5', '5th', 'fifth', 'std 5', 'grade 5',
  'class 6', '6th', 'sixth', 'std 6', 'grade 6',
  'class 7', '7th', 'seventh', 'std 7', 'grade 7',
  'class 8', '8th', 'eighth', 'std 8', 'grade 8',
  'class 9', '9th', 'ninth', 'std 9', 'grade 9',
  'class 10', '10th', 'tenth', 'std 10', 'grade 10',
  'class 11', '11th', 'eleventh', 'std 11', 'grade 11',
  'class 12', '12th', 'twelfth', 'std 12', 'grade 12',
];

/**
 * Get the standard order index for a class name
 */
function getStandardOrderIndex(className: string): number {
  const normalizedName = className.toLowerCase().trim();
  
  // Check for exact matches first
  const exactIndex = standardClassOrder.indexOf(normalizedName);
  if (exactIndex !== -1) {
    return exactIndex;
  }
  
  // Check for partial matches (e.g., "5A" should match "class 5")
  for (let i = 0; i < standardClassOrder.length; i++) {
    const standardName = standardClassOrder[i];
    
    // Handle numeric classes with sections (e.g., "5A", "Class 5A")
    if (standardName.includes('class ') || standardName.includes('std ') || standardName.includes('grade ')) {
      const number = standardName.match(/\d+/)?.[0];
      if (number && normalizedName.includes(number)) {
        return i;
      }
    }
    
    // Handle direct matches
    if (normalizedName.includes(standardName) || standardName.includes(normalizedName)) {
      return i;
    }
  }
  
  // If no match found, return a high number so it appears at the end
  return 999;
}

/**
 * Sort classes according to standard academic progression
 */
export function sortClassesByStandardOrder(classes: Class[]): Class[] {
  return [...classes].sort((a, b) => {
    // Use standard ordering
    const orderA = getStandardOrderIndex(a.name);
    const orderB = getStandardOrderIndex(b.name);
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // If same standard order, sort alphabetically
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get next suggested class name based on existing classes
 */
export function getSuggestedNextClassName(existingClasses: Class[]): string {
  const existingNames = existingClasses.map(c => c.name.toLowerCase());
  
  for (const standardName of standardClassOrder) {
    const isUsed = existingNames.some(name => 
      name.includes(standardName) || standardName.includes(name)
    );
    
    if (!isUsed) {
      // Return proper case version
      if (standardName.includes('class ')) {
        return standardName.replace('class ', 'Class ');
      }
      return standardName.charAt(0).toUpperCase() + standardName.slice(1);
    }
  }
  
  return 'New Class';
}

export { type Class };