export interface EmailTemplate {
  id: string;
  name: string;
  category: "outreach" | "followup" | "proposal" | "custom";
  subject: string;
  htmlContent: string;
  description: string;
}

export const PREBUILT_TEMPLATES: EmailTemplate[] = [
  {
    id: "b2b-outreach-v1",
    name: "B2B Executive Cold Outreach",
    category: "outreach",
    subject: "Strategic B2B Growth Opportunity for {{companyName}}",
    description: "High-converting outreach template targeting VP/Director level decision makers.",
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
  <div style="text-align: left; margin-bottom: 20px; border-bottom: 2px solid #4f46e5; padding-bottom: 12px;">
    <h2 style="color: #4f46e5; margin: 0; font-size: 20px;">xMonks B2B Solutions</h2>
  </div>

  <p style="font-size: 15px; line-height: 1.6;">Hi <strong>{{contactName}}</strong>,</p>

  <p style="font-size: 15px; line-height: 1.6;">
    I noticed your leadership work at <strong>{{companyName}}</strong> in the <strong>{{industry}}</strong> sector. Given your role as <strong>{{designation}}</strong>, I wanted to reach out directly regarding how we help enterprises accelerate B2B pipeline growth and customer acquisition.
  </p>

  <p style="font-size: 15px; line-height: 1.6;">
    Our B2B platform delivers end-to-end deal tracking, stage weightage analysis, and real-time conversion insights tailored specifically for enterprise sales teams.
  </p>

  <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0; font-weight: bold; color: #334155; font-size: 14px;">Key Benefits for {{companyName}}:</p>
    <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #475569;">
      <li>Automated stage weightage & deal probability tracking</li>
      <li>Streamlined B2B lead directory & journey logging</li>
      <li>Instant revenue forecasting & analytics dashboards</li>
    </ul>
  </div>

  <p style="font-size: 15px; line-height: 1.6;">
    Would you be open for a brief 10-minute discovery call next Tuesday or Wednesday?
  </p>

  <div style="margin-top: 24px; text-align: center;">
    <a href="https://xmonks.com" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 14px;">Schedule Discovery Call</a>
  </div>

  <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
    <p style="margin: 0;">Sent via xMonks B2B Lead Engine • B2B Sales Automation</p>
  </div>
</div>`,
  },
  {
    id: "proposal-followup-v1",
    name: "Enterprise Proposal Follow-Up",
    category: "proposal",
    subject: "Following up on B2B Proposal for {{companyName}}",
    description: "Polite and effective follow-up for sent proposals.",
    htmlContent: `<div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a; background-color: #ffffff; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px;">
  <p style="font-size: 15px; line-height: 1.6;">Dear <strong>{{contactName}}</strong>,</p>

  <p style="font-size: 15px; line-height: 1.6;">
    I hope you are having a productive week. I am following up on the B2B proposal we prepared for <strong>{{companyName}}</strong>.
  </p>

  <p style="font-size: 15px; line-height: 1.6;">
    As discussed, our tailored package is designed to support your team's specific objectives in the <strong>{{industry}}</strong> market.
  </p>

  <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px; font-weight: bold; color: #1e293b;">Proposal Highlights:</p>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Recipient: {{contactName}} ({{designation}})</p>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Target Organization: {{companyName}}</p>
  </div>

  <p style="font-size: 15px; line-height: 1.6;">
    Please let me know if you or your executive team have any questions regarding the terms or implementation roadmap. We look forward to partnering with {{companyName}}.
  </p>

  <p style="font-size: 15px; line-height: 1.6; margin-top: 24px;">
    Best regards,<br/>
    <strong>Sales Director, xMonks B2B Team</strong>
  </p>
</div>`,
  },
  {
    id: "product-demo-v1",
    name: "Live Product Demo Invitation",
    category: "outreach",
    subject: "Exclusive Demo: Boosting Sales Conversion at {{companyName}}",
    description: "Invites prospective clients to a live demonstration of the CRM platform.",
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 20px; border-radius: 8px; text-align: center; color: white; margin-bottom: 24px;">
    <h1 style="margin: 0; font-size: 22px;">xMonks CRM Live Demo</h1>
    <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">Exclusive Invitation for {{companyName}}</p>
  </div>

  <p style="font-size: 15px; line-height: 1.6;">Hi {{contactName}},</p>

  <p style="font-size: 15px; line-height: 1.6;">
    Are you looking for a more efficient way to manage your <strong>{{industry}}</strong> lead pipeline and boost sales conversion rates?
  </p>

  <p style="font-size: 15px; line-height: 1.6;">
    We would love to show you a customized demonstration of how xMonks B2B CRM streamlines pipeline visibility, stage weightage tracking, and team collaboration for organizations like {{companyName}}.
  </p>

  <div style="text-align: center; margin: 28px 0;">
    <a href="https://xmonks.com/demo" style="background-color: #9333ea; color: #ffffff; padding: 14px 28px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 15px;">Book Your Live Demo</a>
  </div>

  <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
    If you're unavailable this week, simply reply to this email with a time that works best for you.
  </p>
</div>`,
  },
];
