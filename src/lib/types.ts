export type InspectionType = 'routine' | 'fire_safety' | 'check_in' | 'check_out';
export type InspectionStatus = 'draft' | 'in_progress' | 'completed';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: 'admin' | 'clerk';
  created_at: string;
}

export interface Property {
  id: string;
  title: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postcode: string;
  country: string;
  bedrooms: number | null;
  bathrooms: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface Inspection {
  id: string;
  property_id: string;
  type: InspectionType;
  status: InspectionStatus;
  assigned_to: string | null;
  started_at: string;
  completed_at: string | null;
  created_by: string;
  updated_at: string;
  summary_notes: string | null;
  reference_code: string;
  property?: Property;
  items?: InspectionItem[];
  photos?: Photo[];
}

export interface InspectionItem {
  id: string;
  inspection_id: string;
  section: string;
  question: string;
  question_type: 'text' | 'boolean' | 'select';
  question_options?: string[];
  answer_text: string | null;
  answer_boolean: boolean | null;
  answer_select: string | null;
  notes: string | null;
  order_index: number;
  created_at: string;
}

export interface Photo {
  id: string;
  inspection_id: string;
  section: string | null;
  item_id: string | null;
  storage_key: string;
  original_filename: string;
  width: number | null;
  height: number | null;
  size_bytes: number;
  exif_taken_at: string | null;
  caption: string | null;
  order_index: number;
  uploaded_by: string;
  processing_status: string;
  created_at: string;
  url?: string;
}

export interface PreviewToken {
  id: string;
  inspection_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: any;
  created_at: string;
}

export interface InspectionTemplate {
  type: InspectionType;
  label: string;
  sections: {
    title: string;
    questions: {
      question: string;
      type: 'text' | 'boolean' | 'select';
      options?: string[];
      required?: boolean;
    }[];
  }[];
}

export const INSPECTION_TEMPLATES: InspectionTemplate[] = [
  {
    type: 'routine',
    label: 'Routine Inspection',
    sections: [
      {
        title: 'Property Info',
        questions: [
          { question: 'Property Address', type: 'text', required: true },
          { question: 'Date of Inspection', type: 'text', required: true },
          { question: 'Inspected By', type: 'text', required: true },
          { question: 'Was the tenant present?', type: 'boolean' },
        ],
      },
      {
        title: '1️⃣ General Condition',
        questions: [
          { question: 'Is the property generally clean and tidy?', type: 'boolean' },
          { question: 'Are there any signs of damp, mould, or strong odours?', type: 'select', options: ['None', 'Slight', 'Significant'] },
          { question: 'Are all smoke alarms and carbon monoxide alarms working?', type: 'boolean' },
        ],
      },
      {
        title: '2️⃣ Entry & Hallway',
        questions: [
          { question: 'Is the main door secure and in good condition (locks, frame, handle)?', type: 'boolean' },
          { question: 'Are walls and paintwork free from damage or marks?', type: 'boolean' },
          { question: 'Is the flooring clean and undamaged?', type: 'boolean' },
        ],
      },
      {
        title: '3️⃣ Living Room',
        questions: [
          { question: 'Are walls, ceiling, and flooring clean and free of damage?', type: 'boolean' },
          { question: 'Are windows, curtains, or blinds in good working order?', type: 'boolean' },
          { question: 'If furnished, are all listed items present and undamaged?', type: 'boolean' },
        ],
      },
      {
        title: '4️⃣ Kitchen',
        questions: [
          { question: 'Are all appliances clean and working (fridge, oven, hob, washing machine)?', type: 'boolean' },
          { question: 'Are cupboards and worktops clean, dry, and free from damage?', type: 'boolean' },
          { question: 'Are sink and taps free of leaks and limescale?', type: 'boolean' },
          { question: 'Is extractor fan working and clean?', type: 'boolean' },
        ],
      },
      {
        title: '5️⃣ Bathroom(s)',
        questions: [
          { question: 'Is toilet, basin, and shower/bath working correctly?', type: 'boolean' },
          { question: 'Are tiles, sealant, and grouting clean and intact?', type: 'boolean' },
          { question: 'Is ventilation adequate (fan/window)?', type: 'boolean' },
        ],
      },
      {
        title: '6️⃣ Bedrooms',
        questions: [
          { question: 'Is each room clean, tidy, and free of damage?', type: 'boolean' },
          { question: 'Are beds, wardrobes, and other furnishings in good condition (if furnished)?', type: 'boolean' },
        ],
      },
      {
        title: '7️⃣ Exterior & Garden',
        questions: [
          { question: 'Is front pathway clear and safe?', type: 'boolean' },
          { question: 'Is the garden tidy and maintained?', type: 'boolean' },
          { question: 'Are bins properly stored and emptied?', type: 'boolean' },
        ],
      },
      {
        title: '8️⃣ Safety Checks',
        questions: [
          { question: 'Are smoke alarms working?', type: 'boolean' },
          { question: 'Is CO alarm present and working?', type: 'boolean' },
          { question: 'Is the fire exit route clear?', type: 'boolean' },
          { question: 'Are there any visible electrical or gas hazards?', type: 'boolean' },
        ],
      },
      {
        title: '9️⃣ Tenant Feedback',
        questions: [
          { question: 'Any maintenance requests or comments?', type: 'text' },
        ],
      },
      {
        title: '🔟 Inspector Summary',
        questions: [
          { question: 'Overall Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'Recommended Actions', type: 'text' },
          { question: 'Follow-Up Required', type: 'boolean' },
        ],
      },
      {
        title: '✅ Sign-Off',
        questions: [
          { question: 'Inspector Name & Signature', type: 'text' },
          { question: 'Tenant Name & Signature', type: 'text' },
          { question: 'Date Signed', type: 'text' },
        ],
      },
    ],
  },
  {
    type: 'fire_safety',
    label: 'Fire Safety Inspection',
    sections: [
      {
        title: 'Property Information',
        questions: [
          { question: 'Property Address', type: 'text', required: true },
          { question: 'Date of Inspection', type: 'text', required: true },
          { question: 'Inspected By', type: 'text', required: true },
          { question: 'Tenant / Occupant Present', type: 'boolean' },
        ],
      },
      {
        title: '1️⃣ Fire Detection & Alarm Systems',
        questions: [
          { question: 'Are smoke alarms installed on every floor and in escape routes?', type: 'boolean' },
          { question: 'Are heat detectors fitted in kitchens and other high-risk areas?', type: 'boolean' },
          { question: 'Are all alarms tested and functioning correctly at time of inspection?', type: 'boolean' },
          { question: 'Are alarms interlinked (mains or wireless)?', type: 'select', options: ['Yes', 'No', 'N/A'] },
        ],
      },
      {
        title: '2️⃣ Fire Doors & Exits',
        questions: [
          { question: 'Are all internal fire doors in good condition (intact seals, closers fitted)?', type: 'boolean' },
          { question: 'Do all fire doors close fully and securely without obstruction?', type: 'boolean' },
          { question: 'Are escape routes and exits clear of furniture or obstacles?', type: 'boolean' },
          { question: 'Are exit routes and signage visible and illuminated (if applicable)?', type: 'select', options: ['Yes', 'No', 'N/A'] },
        ],
      },
      {
        title: '3️⃣ Fire Extinguishers & Blankets',
        questions: [
          { question: 'Are extinguishers provided (usually 1 per floor or per 200m²)?', type: 'boolean' },
          { question: 'Are extinguishers mounted correctly and within expiry date?', type: 'boolean' },
          { question: 'Is a fire blanket installed in the kitchen area?', type: 'boolean' },
          { question: 'Are staff/tenants aware of how to use extinguishers and blankets?', type: 'boolean' },
        ],
      },
      {
        title: '4️⃣ Emergency Lighting & Signage',
        questions: [
          { question: 'Are emergency lights operational and tested monthly?', type: 'select', options: ['Yes', 'No', 'N/A'] },
          { question: 'Are exit signs clearly visible and pointing in correct direction?', type: 'boolean' },
          { question: 'Is lighting adequate in stairways and escape corridors?', type: 'boolean' },
        ],
      },
      {
        title: '5️⃣ Electrical & Gas Safety',
        questions: [
          { question: 'Are electrical sockets, appliances, and wiring in good visual condition?', type: 'boolean' },
          { question: 'Has an EICR (Electrical Installation Condition Report) been completed within 5 years?', type: 'boolean' },
          { question: 'Is a valid Gas Safety Certificate (CP12) on file?', type: 'select', options: ['Yes', 'No', 'N/A'] },
          { question: 'Are CO alarms present near gas appliances and functioning?', type: 'select', options: ['Yes', 'No', 'N/A'] },
        ],
      },
      {
        title: '6️⃣ Escape Routes & Access',
        questions: [
          { question: 'Are corridors and staircases free from clutter or trip hazards?', type: 'boolean' },
          { question: 'Are windows (where applicable) able to open for escape?', type: 'boolean' },
          { question: 'Are final exit doors easy to open from inside (no key required)?', type: 'boolean' },
        ],
      },
      {
        title: '7️⃣ Fire Risk Awareness',
        questions: [
          { question: 'Is there a Fire Safety Notice displayed (e.g. in hallway)?', type: 'boolean' },
          { question: 'Are tenants aware of evacuation procedure and assembly point?', type: 'boolean' },
          { question: 'Are fire drills conducted (for HMOs / commercial)?', type: 'select', options: ['Yes', 'No', 'N/A'] },
        ],
      },
      {
        title: '8️⃣ Fire Risk Assessment',
        questions: [
          { question: 'Is there a valid Fire Risk Assessment (FRA) for the building?', type: 'boolean' },
          { question: 'Date of last FRA', type: 'text' },
          { question: 'Next FRA due', type: 'text' },
        ],
      },
      {
        title: '9️⃣ Inspector Summary',
        questions: [
          { question: 'Overall Fire Safety Rating', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'Immediate Actions Required', type: 'text' },
          { question: 'Recommended Upgrades', type: 'text' },
          { question: 'Follow-Up Inspection Due', type: 'text' },
        ],
      },
      {
        title: '✅ Sign-Off',
        questions: [
          { question: 'Inspector Name & Signature', type: 'text' },
          { question: 'Tenant / Owner Signature', type: 'text' },
          { question: 'Date Signed', type: 'text' },
        ],
      },
    ],
  },
  {
    type: 'check_in',
    label: 'Check-In Inspection',
    sections: [
      {
        title: 'Property Information',
        questions: [
          { question: 'Property Address', type: 'text', required: true },
          { question: 'Date of Check-In', type: 'text', required: true },
          { question: 'Clerk / Inspector Name', type: 'text', required: true },
          { question: 'Tenant Present', type: 'boolean' },
          { question: 'Keys Handed Over', type: 'boolean' },
          { question: 'List key sets issued', type: 'text' },
        ],
      },
      {
        title: '1️⃣ Entry & Hallway',
        questions: [
          { question: 'Is the main door and lock secure and undamaged?', type: 'boolean' },
          { question: 'Are walls and paintwork free from marks or holes?', type: 'boolean' },
          { question: 'Is flooring clean and undamaged?', type: 'boolean' },
          { question: 'Are lights and switches working?', type: 'boolean' },
        ],
      },
      {
        title: '2️⃣ Living Room',
        questions: [
          { question: 'Walls and ceiling in good decorative order?', type: 'boolean' },
          { question: 'Windows clean and functional (locks & latches)?', type: 'boolean' },
          { question: 'Curtains/blinds clean and intact?', type: 'boolean' },
          { question: 'Flooring (carpet/laminate) clean and damage-free?', type: 'boolean' },
          { question: 'Furniture present and undamaged (if furnished)?', type: 'boolean' },
          { question: 'List items', type: 'text' },
        ],
      },
      {
        title: '3️⃣ Kitchen',
        questions: [
          { question: 'Worktops and cupboards clean and undamaged?', type: 'boolean' },
          { question: 'Sink/taps working and leak-free?', type: 'boolean' },
          { question: 'Appliances clean and functioning (fridge, oven, hob, washer)?', type: 'boolean' },
          { question: 'Extractor fan clean and working?', type: 'boolean' },
          { question: 'Flooring clean and intact?', type: 'boolean' },
        ],
      },
      {
        title: '4️⃣ Bathroom(s)',
        questions: [
          { question: 'Toilet flushes and seals correctly?', type: 'boolean' },
          { question: 'Basin/taps leak-free and clean?', type: 'boolean' },
          { question: 'Shower/bath works with good water pressure?', type: 'boolean' },
          { question: 'Sealant, tiles, and grout in good condition?', type: 'boolean' },
          { question: 'Ventilation (fan/window) working?', type: 'boolean' },
        ],
      },
      {
        title: '5️⃣ Bedrooms',
        questions: [
          { question: 'Walls, ceiling, and paintwork clean and intact?', type: 'boolean' },
          { question: 'Flooring/carpets clean and damage-free?', type: 'boolean' },
          { question: 'Furniture present and undamaged (if furnished)?', type: 'boolean' },
          { question: 'Windows and blinds functional?', type: 'boolean' },
        ],
      },
      {
        title: '6️⃣ Exterior / Garden / Balcony',
        questions: [
          { question: 'Pathways clear and safe?', type: 'boolean' },
          { question: 'Garden tidy and bins empty?', type: 'boolean' },
          { question: 'Fencing, gates, and external doors secure?', type: 'boolean' },
        ],
      },
      {
        title: '7️⃣ Safety & Compliance',
        questions: [
          { question: 'Smoke alarms tested and working?', type: 'boolean' },
          { question: 'Carbon monoxide alarm present and working?', type: 'boolean' },
          { question: 'Gas safety certificate (CP12) valid?', type: 'select', options: ['Yes', 'No', 'N/A'] },
          { question: 'Electrical safety (EICR) valid?', type: 'boolean' },
          { question: 'Fire exit routes clear?', type: 'boolean' },
        ],
      },
      {
        title: '8️⃣ Meter Readings',
        questions: [
          { question: 'Gas meter reading', type: 'text' },
          { question: 'Gas meter location', type: 'text' },
          { question: 'Electric meter reading', type: 'text' },
          { question: 'Electric meter location', type: 'text' },
          { question: 'Water meter reading', type: 'text' },
          { question: 'Water meter location', type: 'text' },
        ],
      },
      {
        title: '9️⃣ Inventory Confirmation',
        questions: [
          { question: 'Has the tenant agreed that listed items are present and in stated condition?', type: 'boolean' },
          { question: 'Any discrepancies reported?', type: 'text' },
        ],
      },
      {
        title: '🔍 Inspector Summary',
        questions: [
          { question: 'Overall Property Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'Cleaning Standard', type: 'select', options: ['Professional', 'Tenant Clean', 'Below Standard'] },
          { question: 'Repairs or Maintenance Required', type: 'text' },
        ],
      },
      {
        title: '✅ Sign-Off',
        questions: [
          { question: 'Inspector Signature', type: 'text' },
          { question: 'Tenant Signature', type: 'text' },
          { question: 'Date', type: 'text' },
          { question: 'Keys Returned', type: 'boolean' },
        ],
      },
    ],
  },
  {
    type: 'check_out',
    label: 'Check-Out Inspection',
    sections: [
      {
        title: 'Property Information',
        questions: [
          { question: 'Property Address', type: 'text', required: true },
          { question: 'Date of Check-Out', type: 'text', required: true },
          { question: 'Clerk / Inspector Name', type: 'text', required: true },
          { question: 'Tenant Present', type: 'boolean' },
          { question: 'Were all keys returned?', type: 'boolean' },
          { question: 'List key sets returned', type: 'text' },
        ],
      },
      {
        title: '1️⃣ Entry & Hallway',
        questions: [
          { question: 'Is the main door secure and undamaged?', type: 'boolean' },
          { question: 'Are the walls and paintwork clean and undamaged compared to check-in?', type: 'select', options: ['Same', 'Worse', 'Improved'] },
          { question: 'Is the flooring clean and undamaged?', type: 'boolean' },
          { question: 'Are lighting and switches working correctly?', type: 'boolean' },
        ],
      },
      {
        title: '2️⃣ Living Room',
        questions: [
          { question: 'Are walls, ceiling, and paintwork in good condition?', type: 'select', options: ['Same', 'Worse', 'Improved'] },
          { question: 'Are windows and blinds clean and working?', type: 'boolean' },
          { question: 'Is the flooring/carpet clean and damage-free?', type: 'boolean' },
          { question: 'If furnished, are all items still present and undamaged?', type: 'boolean' },
          { question: 'List missing/damaged items', type: 'text' },
        ],
      },
      {
        title: '3️⃣ Kitchen',
        questions: [
          { question: 'Are cupboards and worktops clean and free from damage?', type: 'boolean' },
          { question: 'Are sink and taps working and leak-free?', type: 'boolean' },
          { question: 'Are all appliances (fridge, oven, hob, washer, etc.) clean and working?', type: 'boolean' },
          { question: 'Is the extractor fan working and clean?', type: 'boolean' },
          { question: 'Is the kitchen flooring clean and intact?', type: 'boolean' },
        ],
      },
      {
        title: '4️⃣ Bathroom(s)',
        questions: [
          { question: 'Are toilet, basin, and shower/bath working properly?', type: 'boolean' },
          { question: 'Are tiles, grout, and sealant clean and intact?', type: 'boolean' },
          { question: 'Is ventilation (fan/window) working effectively?', type: 'boolean' },
          { question: 'Are there any signs of mould or water damage?', type: 'select', options: ['None', 'Slight', 'Severe'] },
        ],
      },
      {
        title: '5️⃣ Bedrooms',
        questions: [
          { question: 'Are walls, ceiling, and paintwork clean and undamaged?', type: 'boolean' },
          { question: 'Is flooring or carpet clean and free of damage?', type: 'boolean' },
          { question: 'Are windows, blinds, and curtains functional?', type: 'boolean' },
          { question: 'If furnished, are all items present and in good condition?', type: 'boolean' },
        ],
      },
      {
        title: '6️⃣ Exterior / Garden / Balcony',
        questions: [
          { question: 'Is the front pathway or entrance clear and safe?', type: 'boolean' },
          { question: 'Is the garden tidy and bins emptied?', type: 'boolean' },
          { question: 'Are fences, gates, or exterior doors secure?', type: 'boolean' },
        ],
      },
      {
        title: '7️⃣ Cleaning Standard',
        questions: [
          { question: 'Has the property been left in professionally clean condition?', type: 'boolean' },
          { question: 'Is the oven, hob, and extractor clean?', type: 'boolean' },
          { question: 'Are carpets vacuumed or professionally cleaned?', type: 'boolean' },
          { question: 'Are bathrooms sanitised and mould-free?', type: 'boolean' },
        ],
      },
      {
        title: '8️⃣ Safety Checks',
        questions: [
          { question: 'Are smoke alarms tested and working?', type: 'boolean' },
          { question: 'Is the carbon monoxide alarm present and working?', type: 'boolean' },
          { question: 'Are fire exits and escape routes clear?', type: 'boolean' },
        ],
      },
      {
        title: '9️⃣ Meter Readings',
        questions: [
          { question: 'Gas - Final Reading', type: 'text' },
          { question: 'Gas - Location', type: 'text' },
          { question: 'Electric - Final Reading', type: 'text' },
          { question: 'Electric - Location', type: 'text' },
          { question: 'Water - Final Reading', type: 'text' },
          { question: 'Water - Location', type: 'text' },
        ],
      },
      {
        title: '🔍 Summary & Deposit Recommendations',
        questions: [
          { question: 'Overall condition compared to check-in?', type: 'select', options: ['Same', 'Worse', 'Improved'] },
          { question: 'Are there any damages or missing items?', type: 'boolean' },
          { question: 'Describe damages or missing items', type: 'text' },
          { question: 'Is any cleaning or repair required before next tenancy?', type: 'boolean' },
          { question: 'Cleaning/repair details', type: 'text' },
          { question: 'Are deposit deductions recommended?', type: 'boolean' },
          { question: 'Deduction details', type: 'text' },
        ],
      },
      {
        title: '✅ Sign-Off',
        questions: [
          { question: 'Inspector Signature', type: 'text' },
          { question: 'Tenant Signature', type: 'text' },
          { question: 'Date Signed', type: 'text' },
          { question: 'Forwarding Address (for deposit return)', type: 'text' },
        ],
      },
    ],
  },
];

export function getInspectionTemplate(type: InspectionType): InspectionTemplate | undefined {
  return INSPECTION_TEMPLATES.find((t) => t.type === type);
}

// Generate dynamic template with bedroom/bathroom sections
export function generateDynamicTemplate(
  type: InspectionType,
  bedrooms: number = 0,
  bathrooms: number = 0
): InspectionTemplate | undefined {
  const baseTemplate = getInspectionTemplate(type);
  if (!baseTemplate) return undefined;

  // Clone the template
  const dynamicTemplate: InspectionTemplate = {
    ...baseTemplate,
    sections: [...baseTemplate.sections],
  };

  // Find the index where we should insert bedroom/bathroom sections
  let insertIndex = -1;
  let bedroomSectionIndex = -1;
  let bathroomSectionIndex = -1;

  // Find existing bedroom/bathroom sections to replace
  dynamicTemplate.sections.forEach((section, index) => {
    if (section.title.includes('Bedroom')) {
      bedroomSectionIndex = index;
    }
    if (section.title.includes('Bathroom')) {
      bathroomSectionIndex = index;
    }
  });

  // Only process bedrooms if we have a valid count
  if (bedrooms > 0 && bedroomSectionIndex !== -1) {
    insertIndex = bedroomSectionIndex;
    dynamicTemplate.sections.splice(bedroomSectionIndex, 1);
    // Adjust bathroom index if it comes after bedroom
    if (bathroomSectionIndex > bedroomSectionIndex) {
      bathroomSectionIndex--;
    }

    // Generate individual bedroom sections
    const bedroomSections: InspectionTemplate['sections'] = [];
    
    for (let i = 1; i <= bedrooms; i++) {
      bedroomSections.push({
        title: `🛏️ Bedroom ${i}`,
        questions: [
          { question: `Is Bedroom ${i} clean and tidy?`, type: 'boolean' },
          { question: 'Overall Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'Walls and ceiling condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'] },
          { question: 'Floor/Carpet condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'] },
          { question: 'Windows and frames', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'] },
          { question: 'Curtains/Blinds present and working?', type: 'boolean' },
          { question: 'Door and handles', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'] },
          { question: 'Light fixtures working?', type: 'boolean' },
          { question: 'Power sockets working?', type: 'boolean' },
          { question: 'Heating/Radiator working?', type: 'boolean' },
          { question: 'If furnished - Bed condition', type: 'select', options: ['N/A', 'Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'If furnished - Wardrobe condition', type: 'select', options: ['N/A', 'Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'Any damages or repairs needed?', type: 'text' },
        ],
      });
    }
    
    dynamicTemplate.sections.splice(insertIndex, 0, ...bedroomSections);
    // Adjust bathroom index
    if (bathroomSectionIndex !== -1 && bathroomSectionIndex >= insertIndex) {
      bathroomSectionIndex += bedroomSections.length;
    }
  }

  // Only process bathrooms if we have a valid count
  if (bathrooms > 0 && bathroomSectionIndex !== -1) {
    dynamicTemplate.sections.splice(bathroomSectionIndex, 1);
    
    // Generate individual bathroom sections
    const bathroomSections: InspectionTemplate['sections'] = [];
    
    for (let i = 1; i <= bathrooms; i++) {
      bathroomSections.push({
        title: `🚿 Bathroom ${i}`,
        questions: [
          { question: `Is Bathroom ${i} clean?`, type: 'boolean' },
          { question: 'Overall Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'Toilet working correctly?', type: 'boolean' },
          { question: 'Basin/Sink working correctly?', type: 'boolean' },
          { question: 'Bath working correctly?', type: 'boolean' },
          { question: 'Shower working correctly?', type: 'boolean' },
          { question: 'Taps - any leaks or drips?', type: 'boolean' },
          { question: 'Tiles condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Missing/Damaged'] },
          { question: 'Sealant/Grouting condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Mouldy'] },
          { question: 'Floor condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'] },
          { question: 'Extractor fan working?', type: 'boolean' },
          { question: 'Mirror present and undamaged?', type: 'boolean' },
          { question: 'Cabinet/Storage condition', type: 'select', options: ['N/A', 'Excellent', 'Good', 'Fair', 'Poor'] },
          { question: 'Any damages or repairs needed?', type: 'text' },
        ],
      });
    }
    
    dynamicTemplate.sections.splice(bathroomSectionIndex, 0, ...bathroomSections);
  }

  return dynamicTemplate;
}

export function generateReferenceCode(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INS-${year}${month}-${random}`;
}
