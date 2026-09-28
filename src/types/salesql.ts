export interface SalesQLOrganization {
  uuid?: string;
  name?: string;
  website?: string;
  website_domain?: string;
  linkedin_url?: string;
  logo?: string;
  founded_year?: number;
  number_of_employees?: string;
  type?: string;
}

export interface SalesQLEmail {
  email: string;
  type?: "Work" | "Direct" | "Personal" | string;
  status?: "Valid" | "Unverifiable" | "Catch-all" | string;
}

export interface SalesQLPhone {
  phone: string;
  type?: "Work" | "Mobile" | "Direct" | string;
  country_code?: string;
  is_valid?: boolean;
}

export interface SalesQLWorkExperience {
  title?: string;
  description?: string;
  timestamp_start?: number;
  timestamp_end?: number;
  is_current?: boolean;
  organization?: SalesQLOrganization;
}

export interface SalesQLPerson {
  uuid?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  linkedin_url?: string;
  title?: string;
  headline?: string;
  image?: string;
  emails?: SalesQLEmail[];
  phones?: SalesQLPhone[];
  organization?: SalesQLOrganization;
  work_experience?: SalesQLWorkExperience[];
  timestamp_work_experience_start?: number;
}

export type ProspectType = "person" | "organization";

export interface ProspectHistoryRecord {
  id: string;
  type: ProspectType;
  query: string;
  personData?: SalesQLPerson;
  orgData?: SalesQLOrganization;
  prospectedBy?: string;
  prospectedAt: string;
  prospectedAtMs?: number;
  convertedToLeadId?: string;
  convertedToColdClientId?: string;
}
