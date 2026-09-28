import { SalesQLOrganization, SalesQLPerson, BulkEnrichPersonQuery } from "@/types/salesql";

/**
 * Demo Data 1: Apple Organization
 */
export const DEMO_APPLE_ORGANIZATION: SalesQLOrganization = {
  founded_year: 1976,
  linkedin_url: "https://linkedin.com/company/apple",
  name: "Apple",
  number_of_employees: "10001+",
  type: "public",
  uuid: "f38f14b5-3e9f-4653-8c50-ce5218555d38",
  website: "http://www.apple.com/careers",
  website_domain: "apple.com",
};

/**
 * Demo Data 2: Ariel Camino (CEO at SalesQL)
 */
export const DEMO_ARIEL_PERSON: SalesQLPerson = {
  uuid: "97f0fc91-745a-4985-b840-4227540406da",
  first_name: "Ariel",
  last_name: "Camino",
  full_name: "Ariel Camino",
  linkedin_url: "https://linkedin.com/in/arielcamino2",
  title: "CEO",
  headline: "CEO at SalesQL",
  emails: [
    {
      email: "a***l@s*****l.com",
      type: "Work",
      status: "Valid",
    },
    {
      email: "a***l@s*****l.com",
      type: "Work",
      status: "Valid",
    },
  ],
  phones: [
    {
      phone: "+44 ****-**50",
      type: "Work",
      is_valid: true,
    },
  ],
  organization: {
    uuid: "d6e9b303-0051-4e1c-8a62-b2cc3dae351e",
    name: "SalesQL",
    website: "https://salesql.com/",
    website_domain: "salesql.com",
    linkedin_url: "https://linkedin.com/company/salesql-3",
    founded_year: 2019,
    number_of_employees: "1 - 10",
  },
  work_experience: [
    {
      title: "CEO",
      timestamp_start: 1522540800000,
      is_current: true,
      organization: {
        uuid: "d6e9b303-0051-4e1c-8a62-b2cc3dae351e",
        name: "SalesQL",
        website: "https://salesql.com/",
        website_domain: "salesql.com",
        linkedin_url: "https://linkedin.com/company/salesql-3",
        logo: "https://salesql.s3.amazonaws.com/company/d6e9b303-0051-4e1c-8a62-b2cc3dae351e-salesql.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAYJKOCOMUUTT46CWY%2F20260527%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260527T094318Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=b2e18bcb47767bf0abbd4b2a95b30731528e889cc427fc24eba4dee93934f00a",
        founded_year: 2019,
        number_of_employees: "1 - 10",
      },
    },
    {
      title: "Software & Data Engineer",
      timestamp_start: 1477958400000,
      timestamp_end: 1577836800000,
      is_current: false,
      organization: {
        uuid: "f40ec1a1-b48c-4377-9c0c-94b7afd97452",
        name: "Giving Assistant",
        website: "https://givingassistant.org",
        website_domain: "givingassistant.org",
        linkedin_url: "https://linkedin.com/company/giving-assistant-inc",
        logo: "https://salesql.s3.amazonaws.com/company/f40ec1a1-b48c-4377-9c0c-94b7afd97452-giving-assistant.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAYJKOCOMUUTT46CWY%2F20260527%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260527T094318Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=ea86a23a2c2b3133ff7aec9c3c4d2bbbcc2fb5d0b49bce33b30e41a2472a6b3a",
        founded_year: 2014,
        number_of_employees: "1 - 10",
        type: "privately-held",
      },
    },
    {
      title: "Software Engineer",
      timestamp_start: 1427846400000,
      timestamp_end: 1477958400000,
      is_current: false,
      organization: {
        uuid: "7076927e-fe8f-4e39-a8aa-d431032f533c",
        name: "Ripio",
        website: "https://www.ripio.com/en/",
        website_domain: "ripio.com",
        linkedin_url: "https://linkedin.com/company/ripio",
        logo: "https://salesql.s3.amazonaws.com/company/7076927e-fe8f-4e39-a8aa-d431032f533c-ripio.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAYJKOCOMUUTT46CWY%2F20260527%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260527T094318Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=98548c5a14a3f26aef8c25e10efb761da9477c07fb02bcd6ebb860dc6e5cf1ea",
        founded_year: 2013,
        number_of_employees: "51 - 200",
        type: "privately-held",
      },
    },
    {
      title: "Co Founder & Full Stack Dev",
      timestamp_start: 1293840000000,
      timestamp_end: 1425168000000,
      is_current: false,
      organization: {
        uuid: "c84240d3-68fc-4e5c-b194-b6b9b35136d8",
        name: "Devecoop",
        website: "http://www.devecoop.com",
        website_domain: "devecoop.com",
        linkedin_url: "https://linkedin.com/company/devecoop-software",
        logo: "https://salesql.s3.amazonaws.com/company/c84240d3-68fc-4e5c-b194-b6b9b35136d8-devecoop.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAYJKOCOMUUTT46CWY%2F20260527%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260527T094318Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=217de4c8488b8ba6925d3e8baec6495f3d0ff2275adb9a5a2ef8de906500dfc7",
        founded_year: 2010,
        number_of_employees: "11 - 50",
        type: "partnership",
      },
    },
  ],
  timestamp_work_experience_start: 1293840000000,
};

/**
 * Demo Data 3: Bulk Batch with Ariel Camino + Person Not Found
 */
export const DEMO_BULK_RESULTS: {
  query: BulkEnrichPersonQuery;
  person?: SalesQLPerson;
  error?: string;
}[] = [
  {
    query: {
      linkedin_url: "https://linkedin.com/in/arielcamino2",
      full_name: "Ariel Camino",
      organization_name: "SalesQL",
    },
    person: DEMO_ARIEL_PERSON,
  },
  {
    query: {
      email: "unknown.lead@example.com",
      full_name: "Unknown Executive",
      organization_name: "Nonexistent Corp",
    },
    error: "Person not found",
  },
];
