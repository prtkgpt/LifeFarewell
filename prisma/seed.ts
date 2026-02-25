import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// ─── VENDOR SEED DATA ───────────────────────────────────────────────────────

interface VendorSeed {
  name: string;
  category: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  rating: number;
  priceRange: string;
  description: string;
  services: string[];
}

const vendors: VendorSeed[] = [
  // ── Livermore, CA (4 vendors) ──────────────────────────────────────────
  {
    name: "Callaghan Mortuary",
    category: "funeral_home",
    city: "Livermore",
    state: "CA",
    address: "3833 East Ave, Livermore, CA 94550",
    phone: "(925) 447-2942",
    email: "info@callaghanmortuary.com",
    website: "https://www.callaghanmortuary.com",
    rating: 4.6,
    priceRange: "$$",
    description:
      "Family-owned mortuary serving the Tri-Valley since 1906. Offers traditional funerals, memorial services, and cremation with compassionate, personalized care.",
    services: [
      "Traditional funeral services",
      "Memorial services",
      "Cremation arrangements",
      "Pre-planning consultations",
      "Grief support resources",
      "Veterans services",
    ],
  },
  {
    name: "Livermore Cremation & Burial",
    category: "cremation",
    city: "Livermore",
    state: "CA",
    address: "4625 First St, Livermore, CA 94551",
    phone: "(925) 243-8100",
    email: "contact@livermorecremation.com",
    website: "https://www.livermorecremation.com",
    rating: 4.2,
    priceRange: "$",
    description:
      "Affordable direct cremation and simple burial services for Livermore and surrounding communities. Transparent pricing with no hidden fees.",
    services: [
      "Direct cremation",
      "Simple burial",
      "Urn selection",
      "Scattering services",
      "Online arrangements",
      "Document assistance",
    ],
  },
  {
    name: "Memory Gardens Cemetery",
    category: "cemetery",
    city: "Livermore",
    state: "CA",
    address: "3873 East Ave, Livermore, CA 94550",
    phone: "(925) 447-8417",
    email: "office@memorygardens-livermore.com",
    website: "https://www.memorygardens-livermore.com",
    rating: 4.4,
    priceRange: "$$",
    description:
      "Serene cemetery and memorial park nestled in the Livermore Valley. Offers ground burial, cremation gardens, and mausoleum niches in a beautifully maintained setting.",
    services: [
      "Ground burial plots",
      "Cremation garden niches",
      "Mausoleum entombment",
      "Monument and marker sales",
      "Pre-need planning",
      "Perpetual care",
    ],
  },
  {
    name: "Tri-Valley Blooms",
    category: "florist",
    city: "Livermore",
    state: "CA",
    address: "2187 First St, Livermore, CA 94550",
    phone: "(925) 373-5100",
    email: "orders@trivalleyblooms.com",
    website: "https://www.trivalleyblooms.com",
    rating: 4.7,
    priceRange: "$",
    description:
      "Local florist specializing in sympathy and funeral arrangements. Same-day delivery throughout the Tri-Valley area with elegant, heartfelt designs.",
    services: [
      "Casket sprays",
      "Standing sprays",
      "Sympathy bouquets",
      "Funeral wreaths",
      "Church and venue arrangements",
      "Same-day delivery",
    ],
  },

  // ── Dublin, CA (3 vendors) ─────────────────────────────────────────────
  {
    name: "Valley Memorial Park",
    category: "cemetery",
    city: "Dublin",
    state: "CA",
    address: "6750 Dublin Blvd, Dublin, CA 94568",
    phone: "(925) 828-4011",
    email: "info@valleymemorialpark.com",
    website: "https://www.valleymemorialpark.com",
    rating: 4.5,
    priceRange: "$$",
    description:
      "Expansive memorial park in the heart of Dublin offering burial, cremation, and memorialization options in a peaceful, park-like setting with panoramic valley views.",
    services: [
      "Ground burial",
      "Cremation niches",
      "Scattering gardens",
      "Private family estates",
      "Bronze memorial plaques",
      "Pre-need arrangements",
    ],
  },
  {
    name: "Dublin Family Funeral Home",
    category: "funeral_home",
    city: "Dublin",
    state: "CA",
    address: "4321 Tassajara Rd, Dublin, CA 94568",
    phone: "(925) 556-8220",
    email: "care@dublinfamilyfh.com",
    website: "https://www.dublinfamilyfh.com",
    rating: 4.8,
    priceRange: "$$$",
    description:
      "Full-service funeral home providing personalized ceremonies, celebration of life events, and comprehensive end-of-life planning for families across the East Bay.",
    services: [
      "Full-service funerals",
      "Celebration of life events",
      "Viewing and visitation",
      "Cremation services",
      "International repatriation",
      "Aftercare programs",
    ],
  },
  {
    name: "East Bay Funeral Transport",
    category: "transport",
    city: "Dublin",
    state: "CA",
    address: "7000 Village Pkwy, Dublin, CA 94568",
    phone: "(925) 556-1400",
    email: "dispatch@eastbayfuneraltransport.com",
    website: "https://www.eastbayfuneraltransport.com",
    rating: 4.3,
    priceRange: "$",
    description:
      "Professional decedent transport and funeral vehicle services covering Alameda and Contra Costa counties. Available 24/7 with dignified, timely transfers.",
    services: [
      "First call and removal",
      "Hospital and hospice transfers",
      "Airport and long-distance transport",
      "Hearse and limousine rental",
      "Escort services",
      "24/7 availability",
    ],
  },

  // ── Pleasanton, CA (3 vendors) ─────────────────────────────────────────
  {
    name: "Tri-Valley Cremation Services",
    category: "cremation",
    city: "Pleasanton",
    state: "CA",
    address: "5025 Hopyard Rd, Pleasanton, CA 94588",
    phone: "(925) 227-1500",
    email: "info@trivalleycremation.com",
    website: "https://www.trivalleycremation.com",
    rating: 4.3,
    priceRange: "$",
    description:
      "Dedicated cremation provider offering affordable, dignified services to Pleasanton and the greater Tri-Valley. Known for transparent pricing and compassionate staff.",
    services: [
      "Direct cremation",
      "Cremation with memorial service",
      "Urn and keepsake selection",
      "Scattering at sea",
      "Death certificate assistance",
      "Online obituaries",
    ],
  },
  {
    name: "Graham-Hitch Mortuary",
    category: "funeral_home",
    city: "Pleasanton",
    state: "CA",
    address: "4167 First St, Pleasanton, CA 94566",
    phone: "(925) 846-5624",
    email: "services@grahamhitchmortuary.com",
    website: "https://www.grahamhitchmortuary.com",
    rating: 4.7,
    priceRange: "$$",
    description:
      "Historic Pleasanton mortuary established in 1891. Combines over a century of experience with modern facilities to honor every life with dignity and grace.",
    services: [
      "Traditional funerals",
      "Graveside services",
      "Memorial celebrations",
      "Cremation packages",
      "Pre-arrangement planning",
      "Grief counseling referrals",
    ],
  },
  {
    name: "Pleasanton Floral & Events",
    category: "florist",
    city: "Pleasanton",
    state: "CA",
    address: "620 Main St, Pleasanton, CA 94566",
    phone: "(925) 846-0228",
    email: "flowers@pleasantonfloral.com",
    website: "https://www.pleasantonfloral.com",
    rating: 4.9,
    priceRange: "$$",
    description:
      "Award-winning Pleasanton florist with deep expertise in sympathy and memorial floral design. Custom arrangements crafted with seasonal blooms and personal touches.",
    services: [
      "Custom sympathy arrangements",
      "Casket and urn sprays",
      "Standing easel displays",
      "Funeral venue décor",
      "Delivery to all Tri-Valley locations",
      "Preservation and keepsake florals",
    ],
  },

  // ── Phoenix, AZ (4 vendors) ────────────────────────────────────────────
  {
    name: "Whitney & Murphy Funeral Home",
    category: "funeral_home",
    city: "Phoenix",
    state: "AZ",
    address: "4800 E Indian School Rd, Phoenix, AZ 85018",
    phone: "(602) 840-5600",
    email: "info@whitneymurphyfuneralhome.com",
    website: "https://www.whitneymurphyfuneralhome.com",
    rating: 4.8,
    priceRange: "$$$",
    description:
      "Premier Phoenix funeral home offering comprehensive services in a warm, elegant setting. Provides bilingual staff, diverse cultural ceremony options, and attentive family care.",
    services: [
      "Full-service funerals",
      "Bilingual services (English/Spanish)",
      "Celebration of life",
      "Visitation and viewing",
      "Cremation services",
      "Pre-planning and pre-payment",
    ],
  },
  {
    name: "Affordable Cremation & Burial Phoenix",
    category: "cremation",
    city: "Phoenix",
    state: "AZ",
    address: "1620 W Camelback Rd, Phoenix, AZ 85015",
    phone: "(602) 265-2229",
    email: "support@affordablecremationphx.com",
    website: "https://www.affordablecremationphx.com",
    rating: 4.1,
    priceRange: "$",
    description:
      "Budget-friendly cremation and simple burial provider in central Phoenix. Straightforward packages with upfront pricing and no pressure to upgrade.",
    services: [
      "Direct cremation",
      "Simple burial",
      "Witness cremation",
      "Shipping of cremated remains",
      "Document filing",
      "Online planning",
    ],
  },
  {
    name: "Greenwood Memory Lawn Cemetery",
    category: "cemetery",
    city: "Phoenix",
    state: "AZ",
    address: "2300 W Van Buren St, Phoenix, AZ 85009",
    phone: "(602) 254-0451",
    email: "office@greenwoodmemorylawn.com",
    website: "https://www.greenwoodmemorylawn.com",
    rating: 4.4,
    priceRange: "$$",
    description:
      "Historic Phoenix cemetery established in 1906 with mature trees and peaceful grounds. Offers traditional burial, lawn crypts, and cremation memorialization.",
    services: [
      "Traditional ground burial",
      "Lawn crypt burial",
      "Cremation memorialization",
      "Monument installation",
      "Chapel services",
      "Perpetual care maintenance",
    ],
  },
  {
    name: "Desert Rose Funeral Transport",
    category: "transport",
    city: "Phoenix",
    state: "AZ",
    address: "3402 N 32nd St, Phoenix, AZ 85018",
    phone: "(602) 957-7700",
    email: "dispatch@desertrosetransport.com",
    website: "https://www.desertrosetransport.com",
    rating: 3.9,
    priceRange: "$",
    description:
      "Reliable 24-hour decedent transport service covering the greater Phoenix metro area. Licensed, insured, and equipped for hospital, home, and long-distance removals.",
    services: [
      "First call removals",
      "Hospital and residence transfers",
      "Long-distance transport",
      "Refrigerated holding",
      "Vehicle escort services",
      "24-hour dispatch",
    ],
  },
];

// ─── CHECKLIST TEMPLATE ─────────────────────────────────────────────────────

interface ChecklistTemplate {
  title: string;
  description: string;
  category: string;
  sortOrder: number;
}

export const BEREAVED_CHECKLIST_TEMPLATE: ChecklistTemplate[] = [
  // ── Immediate (within 24 hours) ────────────────────────────────────────
  {
    title: "Obtain legal pronouncement of death",
    description:
      "If the death occurred at home, contact a physician or hospice to issue a legal pronouncement. If at a hospital, staff will handle this.",
    category: "immediate",
    sortOrder: 1,
  },
  {
    title: "Contact close family and friends",
    description:
      "Notify immediate family members and close friends. Consider designating one person to spread the word so you are not overwhelmed by calls.",
    category: "immediate",
    sortOrder: 2,
  },
  {
    title: "Arrange care of dependents and pets",
    description:
      "Ensure that any children, elderly dependents, or pets of the deceased are looked after immediately.",
    category: "immediate",
    sortOrder: 3,
  },
  {
    title: "Secure the home of the deceased",
    description:
      "Lock the residence, collect mail, adjust thermostat, and arrange for any perishable items. Remove valuables if the home will be unoccupied.",
    category: "immediate",
    sortOrder: 4,
  },
  {
    title: "Choose a funeral home",
    description:
      "Select a licensed funeral home to handle the body, coordinate services, and assist with paperwork. Compare options for pricing and services.",
    category: "immediate",
    sortOrder: 5,
  },
  {
    title: "Determine organ and tissue donation wishes",
    description:
      "Check for a donor card, driver's license designation, or advance directive. Contact the local organ procurement organization if applicable.",
    category: "immediate",
    sortOrder: 6,
  },
  {
    title: "Locate important documents",
    description:
      "Find the will, trust, insurance policies, Social Security card, birth certificate, marriage certificate, military discharge papers, and financial records.",
    category: "immediate",
    sortOrder: 7,
  },

  // ── First week ─────────────────────────────────────────────────────────
  {
    title: "Plan the memorial or funeral service",
    description:
      "Decide on burial vs. cremation, choose a venue, select readings, music, and speakers. Coordinate with clergy or officiant if desired.",
    category: "first_week",
    sortOrder: 8,
  },
  {
    title: "Obtain death certificates (multiple copies)",
    description:
      "Request 10-15 certified copies from the funeral home or county vital records office. These are required by banks, insurers, and government agencies.",
    category: "first_week",
    sortOrder: 9,
  },
  {
    title: "Write and publish an obituary",
    description:
      "Draft an obituary for local newspapers, online memorial sites, and social media. Include service details and any preferred charity for donations.",
    category: "first_week",
    sortOrder: 10,
  },
  {
    title: "Notify employer and inquire about benefits",
    description:
      "Contact the deceased's employer about final paycheck, life insurance, pension, 401(k), and any survivor benefits. Also notify your own employer for bereavement leave.",
    category: "first_week",
    sortOrder: 11,
  },
  {
    title: "Contact Social Security Administration",
    description:
      "Report the death to SSA at 1-800-772-1213. Surviving spouses and dependents may be eligible for survivor benefits or a one-time death benefit of $255.",
    category: "first_week",
    sortOrder: 12,
  },
  {
    title: "Notify life insurance companies",
    description:
      "File claims with all life insurance providers. Gather policy numbers, certified death certificates, and beneficiary identification to expedite processing.",
    category: "first_week",
    sortOrder: 13,
  },
  {
    title: "Contact the deceased's bank and financial institutions",
    description:
      "Notify banks, credit unions, and investment firms. Freeze or restrict accounts as needed and inquire about payable-on-death designations.",
    category: "first_week",
    sortOrder: 14,
  },
  {
    title: "Arrange transportation for out-of-town family",
    description:
      "Help coordinate travel and lodging for family members coming from out of town for the service.",
    category: "first_week",
    sortOrder: 15,
  },

  // ── First month ────────────────────────────────────────────────────────
  {
    title: "Review and file the will with probate court",
    description:
      "If a will exists, file it with the local probate court. Consult an estate attorney to determine whether full probate is required or a simpler process applies.",
    category: "first_month",
    sortOrder: 16,
  },
  {
    title: "Review life insurance and retirement account beneficiaries",
    description:
      "Confirm beneficiary designations on all accounts, IRAs, 401(k)s, and annuities. File claims and request disbursement or rollover where applicable.",
    category: "first_month",
    sortOrder: 17,
  },
  {
    title: "Transfer or close utilities and subscriptions",
    description:
      "Cancel or transfer electric, gas, water, internet, phone, streaming services, magazines, and any other recurring subscriptions.",
    category: "first_month",
    sortOrder: 18,
  },
  {
    title: "Notify credit card companies and close accounts",
    description:
      "Contact each credit card issuer to report the death, pay off balances from the estate, and close the accounts to prevent fraudulent use.",
    category: "first_month",
    sortOrder: 19,
  },
  {
    title: "Update vehicle titles and registrations",
    description:
      "Transfer or sell vehicles owned by the deceased. Visit the DMV with a death certificate and title to update ownership records.",
    category: "first_month",
    sortOrder: 20,
  },
  {
    title: "Redirect mail through USPS",
    description:
      "File a change-of-address or mail-hold request with the post office to forward the deceased's mail to the estate executor or next of kin.",
    category: "first_month",
    sortOrder: 21,
  },
  {
    title: "Notify the IRS and file final tax return",
    description:
      "A final income tax return must be filed for the deceased for the year of death. Consult a CPA or tax professional about estate tax obligations.",
    category: "first_month",
    sortOrder: 22,
  },
  {
    title: "Contact the Veterans Administration (if applicable)",
    description:
      "If the deceased was a veteran, contact the VA at 1-800-827-1000 to inquire about burial benefits, headstone/marker, and survivor benefits.",
    category: "first_month",
    sortOrder: 23,
  },

  // ── Ongoing ────────────────────────────────────────────────────────────
  {
    title: "Monitor the estate through probate",
    description:
      "Work with the estate attorney to manage probate proceedings, pay outstanding debts, and distribute assets according to the will or state law.",
    category: "ongoing",
    sortOrder: 24,
  },
  {
    title: "Manage ongoing bills and property",
    description:
      "Continue paying mortgage, property taxes, HOA fees, and insurance on any real property until it is sold or transferred.",
    category: "ongoing",
    sortOrder: 25,
  },
  {
    title: "Review and update your own estate plan",
    description:
      "After a significant loss, review your own will, powers of attorney, healthcare directives, and beneficiary designations to ensure they are current.",
    category: "ongoing",
    sortOrder: 26,
  },
  {
    title: "Seek grief counseling or support groups",
    description:
      "Consider professional grief counseling, local bereavement support groups, or online communities to help process your loss over time.",
    category: "ongoing",
    sortOrder: 27,
  },
  {
    title: "Plan for anniversary and memorial dates",
    description:
      "Mark important dates such as birthdays, anniversaries, and the date of death. Decide how you would like to honor and remember your loved one.",
    category: "ongoing",
    sortOrder: 28,
  },
];

// ─── MAIN SEED FUNCTION ─────────────────────────────────────────────────────

async function main() {
  console.log("Seeding database...");

  // Upsert vendors inside a transaction
  await prisma.$transaction(
    vendors.map((vendor) =>
      prisma.vendor.upsert({
        where: {
          // Use a composite-style lookup via name + city + state to avoid duplicates.
          // Since there is no @@unique constraint on these fields, we rely on the
          // id field. We generate a deterministic id from the vendor name so that
          // re-running the seed is idempotent.
          id: vendorId(vendor.name),
        },
        update: {
          name: vendor.name,
          category: vendor.category,
          city: vendor.city,
          state: vendor.state,
          address: vendor.address,
          phone: vendor.phone,
          email: vendor.email,
          website: vendor.website,
          rating: vendor.rating,
          priceRange: vendor.priceRange,
          description: vendor.description,
          services: vendor.services,
        },
        create: {
          id: vendorId(vendor.name),
          name: vendor.name,
          category: vendor.category,
          city: vendor.city,
          state: vendor.state,
          address: vendor.address,
          phone: vendor.phone,
          email: vendor.email,
          website: vendor.website,
          rating: vendor.rating,
          priceRange: vendor.priceRange,
          description: vendor.description,
          services: vendor.services,
        },
      })
    )
  );

  console.log(`  Upserted ${vendors.length} vendors.`);
  console.log(
    `  Checklist template exported with ${BEREAVED_CHECKLIST_TEMPLATE.length} items.`
  );
  console.log("Seeding complete.");
}

/**
 * Generate a deterministic, URL-safe id from a vendor name so that
 * repeated seeds are idempotent (upsert by id).
 */
function vendorId(name: string): string {
  return `vendor_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+$/, "")}`;
}

// ─── EXECUTE ────────────────────────────────────────────────────────────────

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
