import { EmailTemplate } from "./emailTemplates";

export function generateAmitEmailHtml(params: {
  personaBadge: string;
  sequenceBadge?: string;
  leadParagraph: string;
  paragraphs: string[];
  calloutBox?: {
    title?: string;
    points: string[];
  };
  highlightSentence?: string;
  closingNote?: string;
  whatsappMessage: string;
}): string {
  const pointsHtml = params.calloutBox?.points
    ? params.calloutBox.points
        .map(
          (p) =>
            `<li style="margin-bottom: 8px; color: #1e293b; font-size: 14.5px; line-height: 1.5;">${p}</li>`
        )
        .join("")
    : "";

  const paragraphsHtml = params.paragraphs
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #1e293b;">${p}</p>`
    )
    .join("");

  const encodedWaMsg = encodeURIComponent(params.whatsappMessage);
  const waUrl = `https://wa.me/919711266420?text=${encodedWaMsg}`;

  return `<div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(35, 63, 77, 0.08);">
  <!-- Top Brand Accent Header -->
  <div style="background: linear-gradient(135deg, #233F4D 0%, #172a34 100%); padding: 22px 28px; position: relative;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="vertical-align: middle;">
          <!-- xMonks Logo (Clean transparent brand PNG) -->
          <img src="/xmonks-logo.png" alt="xMonks" style="height: 44px; max-width: 210px; display: block; object-fit: contain; background: rgba(255,255,255,0.92); padding: 5px 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" />
        </td>
        <td style="vertical-align: middle; text-align: right;">
          <span style="display: inline-block; background-color: rgba(241, 90, 36, 0.2); color: #ff8c5a; border: 1px solid rgba(241, 90, 36, 0.4); font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 10px; border-radius: 20px;">
            ${params.personaBadge}
          </span>
          ${
            params.sequenceBadge
              ? `<div style="color: #94a3b8; font-size: 10px; font-weight: 600; margin-top: 4px;">${params.sequenceBadge}</div>`
              : ""
          }
        </td>
      </tr>
    </table>
    <!-- Orange accent bottom trim -->
    <div style="height: 3px; background: linear-gradient(90deg, #F15A24 0%, #ff8c5a 50%, #233F4D 100%); margin-top: 16px; border-radius: 2px;"></div>
  </div>

  <!-- Email Body Content -->
  <div style="padding: 28px 28px 20px 28px; color: #1e293b; background-color: #ffffff;">
    <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">
      Hi {{contactName}},
    </p>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #1e293b;">
      ${params.leadParagraph}
    </p>

    ${paragraphsHtml}

    ${
      params.calloutBox
        ? `<div style="background-color: #FFF7ED; border-left: 4px solid #F15A24; padding: 16px 18px; margin: 20px 0; border-radius: 0 8px 8px 0; border-top: 1px solid #fed7aa; border-right: 1px solid #fed7aa; border-bottom: 1px solid #fed7aa;">
        ${
          params.calloutBox.title
            ? `<div style="font-weight: 700; color: #233F4D; font-size: 13.5px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">${params.calloutBox.title}</div>`
            : ""
        }
        <ul style="margin: 0; padding-left: 20px;">
          ${pointsHtml}
        </ul>
      </div>`
        : ""
    }

    ${
      params.highlightSentence
        ? `<div style="background: linear-gradient(135deg, rgba(35, 63, 77, 0.05) 0%, rgba(241, 90, 36, 0.08) 100%); border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 14.5px; font-weight: 600; color: #233F4D;">
        ${params.highlightSentence}
      </div>`
        : ""
    }

    ${
      params.closingNote
        ? `<p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.65; color: #1e293b;">
        ${params.closingNote}
      </p>`
        : ""
    }

    <!-- High-Impact WhatsApp Consultation CTA -->
    <div style="margin: 28px 0 22px 0; text-align: center; background-color: #fafaf9; border: 1px dashed #fdba74; border-radius: 12px; padding: 22px 18px;">
      <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #475569;">
        Prefer a direct, informal discussion around {{companyName}}'s priorities?
      </p>
      <a href="${waUrl}" target="_blank" style="background: linear-gradient(135deg, #F15A24 0%, #d94916 100%); color: #ffffff; padding: 13px 28px; font-weight: 700; font-size: 14.5px; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 14px rgba(241, 90, 36, 0.35); text-align: center; transition: all 0.2s ease;">
        💬 Book 20-Min Consultation Call
      </a>
      <div style="font-size: 11.5px; color: #64748b; margin-top: 8px;">
        Connects directly to Amit Shelly on WhatsApp • Quick 20-min slot
      </div>
    </div>
  </div>

  <!-- Amit's Verified Executive Signature Banner -->
  <div style="padding: 0 28px 24px 28px; background-color: #ffffff;">
    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
      <a href="${waUrl}" target="_blank" style="display: block; text-decoration: none;">
        <img src="/amit-signature.png" alt="Amit Shelly - Senior Business Lead Enterprise xMonks" style="max-width: 520px; width: 100%; height: auto; display: block; border-radius: 8px; border: 1px solid #fed7aa; box-shadow: 0 2px 6px rgba(0,0,0,0.04);" />
      </a>
      
      <!-- Direct Contact Links -->
      <table style="width: 100%; margin-top: 12px; font-size: 12.5px; color: #475569;">
        <tr>
          <td style="vertical-align: middle;">
            <span style="font-weight: 700; color: #0f172a;">Amit Shelly</span> • Senior Business Lead – Enterprise
          </td>
          <td style="vertical-align: middle; text-align: right;">
            <a href="tel:+919711266420" style="color: #F15A24; text-decoration: none; font-weight: 700; margin-right: 12px;">📞 +91 9711266420</a>
            <a href="mailto:amit@xmonks.com" style="color: #233F4D; text-decoration: none; font-weight: 700;">✉️ amit@xmonks.com</a>
          </td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Official Footer -->
  <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
    <p style="margin: 0; font-weight: 600; color: #64748b;">
      xMonks • Leadership Development, Executive Coaching & Behavioural Transformation
    </p>
    <p style="margin: 4px 0 0 0;">
      137- First Floor, DLF Star Tower, NH-8, 32 Milestone, Sector 30, Gurugram, Haryana 122001
    </p>
    <p style="margin: 4px 0 0 0;">
      <a href="https://xmonks.com" style="color: #F15A24; text-decoration: none; font-weight: 600;">www.xmonks.com</a> • A Journey Into Shunya & Expansion
    </p>
  </div>
</div>`;
}

export const AMIT_ENTERPRISE_EMAIL_BANK: EmailTemplate[] = [
  // ==========================================
  // SEGMENT A: CHRO / HR HEAD
  // ==========================================
  {
    id: "amit-chro-email-1",
    name: "CHRO 01: Great Connecting | xMonks",
    category: "outreach",
    subject: "Great connecting | xMonks",
    description: "Email 1 (Day 0): After initial call with CHRO/HR Head. Focus on business-aligned leadership interventions.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "CHRO / HR HEAD",
      sequenceBadge: "Sequence Step: Day 0",
      leadParagraph: "It was great connecting with you today.",
      paragraphs: [
        "As discussed, I wanted to briefly introduce xMonks.",
        "We work with organizations on leadership development, executive coaching and behavioural transformation, helping organizations address leadership challenges through customized interventions rather than a one-size-fits-all training approach.",
        "Our starting point is always the business/leadership challenge — and then identifying the right intervention around it.",
      ],
      highlightSentence: "Our starting point is always the business/leadership challenge — and then identifying the right intervention around it.",
      closingNote: "I would be happy to share a few relevant perspectives based on the leadership priorities at {{companyName}}.",
      whatsappMessage: "Hi Amit, Great connecting today. Let's schedule a 20-min consultation call regarding leadership interventions for {{companyName}}.",
    }),
  },
  {
    id: "amit-chro-email-2",
    name: "CHRO 02: Beyond the Leadership Workshop",
    category: "outreach",
    subject: "Beyond the leadership workshop",
    description: "Email 2 (Day 4): Thought leadership on translating workshop learning into lasting leadership behaviour.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "CHRO / HR HEAD",
      sequenceBadge: "Sequence Step: Day 4",
      leadParagraph: "A thought I wanted to share.",
      paragraphs: [
        "Most organizations already have leadership development programmes.",
        "The bigger question is often: <strong>What changes in leadership behaviour after the programme?</strong>",
        "How leaders communicate, make decisions, manage conflict, develop their teams and respond to changing business situations often determines whether development actually translates into impact.",
        "This is where xMonks focuses — connecting leadership development with real behavioural change and application.",
      ],
      calloutBox: {
        title: "Key Behavioural Drivers for Impact",
        points: [
          "Leadership communication & team alignment under pressure",
          "Objective decision-making in ambiguous environments",
          "Constructive conflict management and accountability",
          "Connecting development directly with business performance",
        ],
      },
      closingNote: "Would be interesting to understand how {{companyName}} currently looks at this.",
      whatsappMessage: "Hi Amit, Saw your note on leadership behaviour beyond workshops. Let's do a 20-min consultation call for {{companyName}}.",
    }),
  },
  {
    id: "amit-chro-email-3",
    name: "CHRO 03: Building Leadership Depth",
    category: "outreach",
    subject: "Building leadership depth",
    description: "Email 3 (Day 9): Developing second-line leadership depth to handle scale and ambiguity.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "CHRO / HR HEAD",
      sequenceBadge: "Sequence Step: Day 9",
      leadParagraph: "As organizations grow, developing the next layer of leaders becomes increasingly important.",
      paragraphs: [
        "The challenge is not always identifying high-potential talent.",
        "It is preparing them to handle the critical complexities of next-level leadership:",
      ],
      calloutBox: {
        title: "Next-Layer Leadership Capabilities",
        points: [
          "<strong>Larger teams:</strong> Transitioning from individual expertise to collective execution",
          "<strong>Greater ambiguity:</strong> Making sound business decisions with incomplete data",
          "<strong>Business-critical decisions:</strong> Balancing short-term delivery with strategic vision",
          "<strong>Stakeholder complexity:</strong> Managing cross-functional influence and alignment",
          "<strong>Leadership accountability:</strong> Taking full ownership of enterprise outcomes",
        ],
      },
      closingNote: "xMonks works with organizations to develop these capabilities through structured leadership development and coaching interventions. If leadership pipeline development is currently on your agenda, happy to exchange perspectives.",
      whatsappMessage: "Hi Amit, Leadership pipeline is on our agenda at {{companyName}}. Let's connect for a 20-min discussion.",
    }),
  },
  {
    id: "amit-chro-email-4",
    name: "CHRO 04: A Different Approach to Executive Development",
    category: "outreach",
    subject: "A different approach to executive development",
    description: "Email 4 (Day 15): 1-on-1 executive coaching centered on context, presence, and executive effectiveness.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "CHRO / HR HEAD",
      sequenceBadge: "Sequence Step: Day 15",
      leadParagraph: "For senior leaders, traditional classroom learning may not always address the complexity of their challenges.",
      paragraphs: [
        "Executive coaching creates a more individualised space to work on the nuances of executive presence and decision-making:",
      ],
      calloutBox: {
        title: "Focus Areas in Executive Coaching",
        points: [
          "Executive presence & gravitas",
          "Deep self-awareness & blind-spot mitigation",
          "Leadership effectiveness under high pressure",
          "Navigating complex stakeholder relationships",
          "High-stakes strategic decision-making",
          "Accelerating critical leadership transitions",
        ],
      },
      highlightSentence: "The intervention is centred around the leader's actual business context rather than a generic curriculum.",
      closingNote: "Happy to share how we approach executive coaching at xMonks.",
      whatsappMessage: "Hi Amit, Interested in understanding xMonks' approach to Executive Coaching for {{companyName}}. Let's do a 20-min call.",
    }),
  },

  // ==========================================
  // SEGMENT B: L&D HEAD
  // ==========================================
  {
    id: "amit-ld-email-5",
    name: "L&D 01: Continuing our Conversation | Leadership Development",
    category: "outreach",
    subject: "Continuing our conversation | Leadership Development",
    description: "Email 5 (Day 0): Shifting the L&D conversation from 'Which programme to run' to 'What behaviour must change'.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "L&D HEAD",
      sequenceBadge: "Sequence Step: Day 0",
      leadParagraph: "Great speaking with you.",
      paragraphs: [
        "Given your L&D mandate, I thought I would share a simple way we look at leadership development at xMonks.",
        "Instead of starting with <em>“Which programme should we run?”</em>, we start with:",
        "<strong>“What leadership behaviour or capability needs to change?”</strong>",
        "From there, the intervention could involve leadership development, coaching, assessment, manager development or a combination of these.",
        "This helps make the programme more closely connected to the organization's actual requirement.",
      ],
      highlightSentence: "Connecting L&D interventions directly to observable behavioural shifts and organizational metrics.",
      closingNote: "Happy to explore this around your current L&D priorities at {{companyName}}.",
      whatsappMessage: "Hi Amit, Enjoyed our conversation on L&D priorities. Let's do a 20-min consultation call for {{companyName}}.",
    }),
  },
  {
    id: "amit-ld-email-6",
    name: "L&D 02: One Thought on Manager Effectiveness",
    category: "outreach",
    subject: "One thought on manager effectiveness",
    description: "Email 6 (Day 3): Managing the transition from individual contributor to manager to leader.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "L&D HEAD",
      sequenceBadge: "Sequence Step: Day 3",
      leadParagraph: "One leadership challenge I frequently hear is the transition from individual contributor → manager → leader.",
      paragraphs: [
        "The technical capability may already exist in abundance.",
        "The bigger shift is often around the behavioral core of people leadership:",
      ],
      calloutBox: {
        title: "The Critical Managerial Shift",
        points: [
          "<strong>Delegation:</strong> Letting go of task-doing to empower team ownership",
          "<strong>Feedback:</strong> Delivering timely, candid and developmental feedback",
          "<strong>Difficult Conversations:</strong> Addressing underperformance and conflict early",
          "<strong>Coaching:</strong> Asking powerful questions rather than giving immediate answers",
          "<strong>Accountability:</strong> Fostering a culture of high standards and psychological safety",
          "<strong>People Development:</strong> Proactively grooming successors and champions",
        ],
      },
      closingNote: "At xMonks, we can design the intervention around the specific manager population and business context rather than simply running a generic managerial programme. Would this be relevant to any current initiative at {{companyName}}?",
      whatsappMessage: "Hi Amit, Manager effectiveness is a major focus for {{companyName}}. Let's connect for 20 mins on WhatsApp.",
    }),
  },
  {
    id: "amit-ld-email-7",
    name: "L&D 03: Can Managers Become Better Coaches?",
    category: "outreach",
    subject: "Can managers become better coaches?",
    description: "Email 7 (Day 8): Equipping managers with practical coaching habits in everyday team conversations.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "L&D HEAD",
      sequenceBadge: "Sequence Step: Day 8",
      leadParagraph: "A simple question: <strong>What if managers could use coaching behaviours in their everyday conversations?</strong>",
      paragraphs: [
        "Instead of immediately giving answers or stepping in to troubleshoot, managers learn to:",
      ],
      calloutBox: {
        title: "Everyday Coaching Behaviours",
        points: [
          "Ask better, more reflective questions",
          "Listen deeply without premature judgment",
          "Create true psychological ownership in team members",
          "Develop problem-solving capability across the team",
          "Enable higher autonomy and resilience",
        ],
      },
      highlightSentence: "The objective isn't to turn managers into professional coaches — it is to make coaching a practical, daily leadership behaviour.",
      closingNote: "This is an area where xMonks can support organizations looking to strengthen manager capability. Happy to share a short overview.",
      whatsappMessage: "Hi Amit, Building a coaching culture among managers sounds great for {{companyName}}. Let's schedule a 20-min call.",
    }),
  },
  {
    id: "amit-ld-email-8",
    name: "L&D 04: A Thought on Measuring Leadership Programmes",
    category: "outreach",
    subject: "A thought on measuring leadership programmes",
    description: "Email 8 (Day 14): Measuring real business outcomes and applied behaviour beyond smile sheets.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "L&D HEAD",
      sequenceBadge: "Sequence Step: Day 14",
      leadParagraph: "A quick thought from an L&D perspective.",
      paragraphs: [
        "Sometimes programme success gets measured through the traditional metric chain: <em>attendance → feedback → satisfaction</em>.",
        "But the questions that senior business leaders actually ask are:",
      ],
      calloutBox: {
        title: "The True Measures of Leadership Development",
        points: [
          "<strong>What changed</strong> in daily managerial interactions?",
          "<strong>What specific behaviour</strong> was adopted and applied under pressure?",
          "<strong>What measurable difference</strong> did this create for the team and business?",
        ],
      },
      closingNote: "This is why we encourage organizations to define the desired leadership behaviour and success measures before designing the intervention. It creates a clearer connection between the L&D initiative and business expectations. Would be interesting to hear how you currently measure leadership programme impact at {{companyName}}.",
      whatsappMessage: "Hi Amit, Measuring L&D impact is top of mind for {{companyName}}. Let's talk for 20 minutes.",
    }),
  },

  // ==========================================
  // SEGMENT C: TALENT / Hi-PO / SUCCESSION
  // ==========================================
  {
    id: "amit-talent-email-9",
    name: "Talent 01: Preparing Tomorrow's Leaders (Hi-Po)",
    category: "outreach",
    subject: "Preparing tomorrow's leaders",
    description: "Email 9 (Day 0): Developing high-potential talent for the demands of future leadership roles.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "TALENT & SUCCESSION",
      sequenceBadge: "Sequence Step: Day 0",
      leadParagraph: "High-potential employees often succeed because of their current capabilities.",
      paragraphs: [
        "But future leadership roles demand a fundamentally different set of behaviours and cognitive agility.",
        "The development journey often needs to address transition points such as:",
      ],
      calloutBox: {
        title: "Hi-Po Development Transition Pillars",
        points: [
          "Strategic thinking & enterprise perspective",
          "Executive presence and gravitas",
          "Cross-functional influence without direct authority",
          "People leadership and coaching mindset",
          "Decisive decision-making under ambiguity",
          "Emotional intelligence & self-awareness",
          "Adaptability in fast-moving market conditions",
        ],
      },
      closingNote: "At xMonks, we build customized leadership development journeys around these critical transition points. If Hi-Po or succession development is part of your current agenda, happy to exchange ideas.",
      whatsappMessage: "Hi Amit, We are evaluating Hi-Po development programs for {{companyName}}. Let's do a 20-min consultation call.",
    }),
  },
  {
    id: "amit-talent-email-11",
    name: "Talent 03: When Good Performers Become New Leaders",
    category: "outreach",
    subject: "When good performers become new leaders",
    description: "Email 11 (Day 11): Navigating the pivotal career shifts from doing to enabling, expertise to influence.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "TALENT & SUCCESSION",
      sequenceBadge: "Sequence Step: Day 11",
      leadParagraph: "One of the most important transitions in a career is moving into a larger leadership role.",
      paragraphs: [
        "What made someone successful at one level doesn't necessarily make them successful at the next.",
        "The transition often requires a fundamental shift across four dimensions:",
      ],
      calloutBox: {
        title: "The 4 Foundational Leadership Shifts",
        points: [
          "<strong>Doing → Enabling:</strong> Moving from individual task delivery to unlocking team performance",
          "<strong>Individual Performance → Team Performance:</strong> Measuring success by the team's output",
          "<strong>Functional Expertise → Strategic Influence:</strong> Leading through vision and consensus rather than subject matter expertise",
          "<strong>Day-to-day Execution → Strategic Thinking:</strong> Anticipating future challenges and aligning priorities",
        ],
      },
      closingNote: "Leadership development and coaching can help accelerate that transition and prevent leadership derailment. If this is relevant to your talent agenda, happy to share some perspectives.",
      whatsappMessage: "Hi Amit, Loved the 4 shifts framework. Let's discuss new leader transitions for {{companyName}} over WhatsApp.",
    }),
  },

  // ==========================================
  // SEGMENT D: HRBP
  // ==========================================
  {
    id: "amit-hrbp-email-12",
    name: "HRBP 01: Connecting Leadership Development with Business Needs",
    category: "outreach",
    subject: "Connecting leadership development with business needs",
    description: "Email 12 (Day 0): Business-aligned HR leadership interventions starting from the business challenge.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "HRBP — BUSINESS PARTNER",
      sequenceBadge: "Sequence Step: Day 0",
      leadParagraph: "As an HRBP, you are often closest to the actual business challenges.",
      paragraphs: [
        "That is why I believe leadership development works best when it starts with the business problem rather than the training catalogue.",
        "For example, when partnering with business unit leaders:",
      ],
      calloutBox: {
        title: "Connecting Business Challenges to Solutions",
        points: [
          "<strong>New business growth</strong> → Leadership scalability & bandwidth",
          "<strong>Managerial bottlenecks</strong> → Targeted manager effectiveness interventions",
          "<strong>Succession vulnerabilities</strong> → Accelerated Hi-Po development journeys",
          "<strong>Leadership friction/silos</strong> → Executive team alignment & coaching",
          "<strong>Business transformation</strong> → Change leadership & agile adaptability",
        ],
      },
      closingNote: "At xMonks, we can work backwards from the business challenge and identify the appropriate intervention. Happy to discuss any current leadership priority you are seeing within {{companyName}}.",
      whatsappMessage: "Hi Amit, As an HRBP at {{companyName}}, I'd like to explore business-aligned interventions. Let's do a 20-min call.",
    }),
  },
  {
    id: "amit-hrbp-email-13",
    name: "HRBP 02: An Often-Overlooked Leadership Capability",
    category: "outreach",
    subject: "An often-overlooked leadership capability",
    description: "Email 13 (Day 5): Building managerial capability to handle difficult conversations and drive accountability.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "HRBP — BUSINESS PARTNER",
      sequenceBadge: "Sequence Step: Day 5",
      leadParagraph: "One capability that often separates effective managers from average ones is their ability to handle difficult conversations.",
      paragraphs: [
        "Performance issues. Candid feedback. Interpersonal conflict. Team accountability. Career expectations. Reorganizations.",
        "These aren't technical challenges — they are delicate leadership behaviour challenges.",
        "Developing managers to handle these conversations with greater awareness, empathy and firmness has an immediate impact on employee experience and retention.",
      ],
      highlightSentence: "When managers learn to lean into difficult conversations rather than avoid them, team psychological safety and performance both rise.",
      closingNote: "Happy to share how we approach this capability at xMonks.",
      whatsappMessage: "Hi Amit, Handling difficult conversations is a big priority for our managers at {{companyName}}. Let's connect.",
    }),
  },

  // ==========================================
  // SEGMENT E: DEI / WOMEN LEADERSHIP
  // ==========================================
  {
    id: "amit-dei-email-14",
    name: "DEI 01: Developing the Next Generation of Women Leaders",
    category: "outreach",
    subject: "Developing the next generation of women leaders",
    description: "Email 14 (Day 0): Building an executive pipeline of women leaders ready for enterprise roles.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "DEI & WOMEN LEADERSHIP",
      sequenceBadge: "Sequence Step: Day 0",
      leadParagraph: "I wanted to share a thought around women leadership development.",
      paragraphs: [
        "Many organizations have successfully increased representation at early and mid-career levels.",
        "The next critical challenge is building a sustainable pipeline of women leaders who are ready to step into senior executive and board-level roles.",
        "Development often needs to focus on capabilities that unlock executive mobility:",
      ],
      calloutBox: {
        title: "Key Accelerators for Women in Leadership",
        points: [
          "Leadership confidence & owning personal accomplishments",
          "Executive presence and compelling communication",
          "Enterprise strategic thinking & business acumen",
          "Strategic stakeholder management & sponsorship navigation",
          "Navigating career inflection points and executive transitions",
        ],
      },
      closingNote: "xMonks supports organizations in creating structured leadership development journeys around these capabilities. Happy to understand what {{companyName}} is currently focusing on.",
      whatsappMessage: "Hi Amit, Women leadership development is a key initiative for {{companyName}}. Let's schedule a 20-min consultation call.",
    }),
  },
  {
    id: "amit-dei-email-15",
    name: "DEI 02: Beyond Representation",
    category: "outreach",
    subject: "Beyond representation",
    description: "Email 15 (Day 5): Moving from representation headcount to developmental capability, sponsorship, and visibility.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "DEI & WOMEN LEADERSHIP",
      sequenceBadge: "Sequence Step: Day 5",
      leadParagraph: "A thought I wanted to share.",
      paragraphs: [
        "Women's leadership initiatives can sometimes focus heavily on representation percentages and participation numbers.",
        "The larger, transformative opportunity is to ask:",
        "<strong>Are women leaders getting the development, visibility and leadership experiences required to progress into larger roles?</strong>",
        "That requires looking at capability, confidence, sponsorship, leadership presence and organizational context together.",
      ],
      highlightSentence: "Sustained gender diversity in the C-suite requires deliberate developmental journeys and executive sponsorship.",
      closingNote: "Would be happy to exchange perspectives if this is part of your current agenda at {{companyName}}.",
      whatsappMessage: "Hi Amit, Loved your point on looking beyond representation for women leaders. Let's talk for 20 mins.",
    }),
  },

  // ==========================================
  // SEGMENT F: BUSINESS HEAD / CEO / FUNCTION HEAD
  // ==========================================
  {
    id: "amit-ceo-email-16",
    name: "CEO 01: Leadership Capability as a Business Enabler",
    category: "outreach",
    subject: "Leadership capability as a business enabler",
    description: "Email 16 (Day 0): Business-first approach to leadership development for CEOs and Business Heads.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "CEO & BUSINESS HEAD",
      sequenceBadge: "Sequence Step: Day 0",
      leadParagraph: "I wanted to approach this conversation slightly differently.",
      paragraphs: [
        "Rather than talking about L&D programmes, I would like to understand the business challenges where leadership capability can make a tangible difference.",
        "For example, enterprise leaders frequently partner with us when facing:",
      ],
      calloutBox: {
        title: "Enterprise Business Priorities",
        points: [
          "Scaling the business while maintaining execution rigor",
          "Building stronger second-line leadership depth so the business doesn't depend on a few key individuals",
          "Managing complex transformation and organizational change",
          "Breaking down silos to improve cross-functional collaboration",
          "Preparing functional heads for broader general management roles",
        ],
      },
      closingNote: "At xMonks, we start with the leadership/business challenge and then work backwards to the appropriate intervention. If leadership capability is relevant to any current business priority at {{companyName}}, I'd be glad to exchange perspectives.",
      whatsappMessage: "Hi Amit, Business scalability & second-line leadership are priorities for {{companyName}}. Let's do a 20-min call.",
    }),
  },
  {
    id: "amit-ceo-email-17",
    name: "CEO 02: When Leadership Teams Pull in Different Directions",
    category: "outreach",
    subject: "When leadership teams pull in different directions",
    description: "Email 17 (Day 5): Aligning high-performing senior executive teams around shared priorities and execution.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "CEO & BUSINESS HEAD",
      sequenceBadge: "Sequence Step: Day 5",
      leadParagraph: "A leadership team can have highly capable individuals and still face challenges around alignment.",
      paragraphs: [
        "Different functional priorities. Different decision-making styles. Different views on execution pace. Different expectations from their teams.",
        "Leadership team alignment is therefore not simply about team bonding or offsites.",
        "It is about creating rigorous clarity around shared enterprise priorities, collective behaviours, mutual accountability and ways of working.",
      ],
      highlightSentence: "True alignment creates velocity — when the executive team is in sync, organizational friction drops across every level.",
      closingNote: "This is an area where xMonks works with leadership teams through customized development interventions. Happy to explore if this connects with any current business priority at {{companyName}}.",
      whatsappMessage: "Hi Amit, Executive team alignment is an important topic for {{companyName}}. Let's connect for 20 minutes.",
    }),
  },
  {
    id: "amit-conversion-email-18",
    name: "Closing 01: Worth a 20-Minute Conversation?",
    category: "outreach",
    subject: "Worth a 20-minute conversation?",
    description: "Email 18 (Day 18-27): Final conversion meeting request. Respectful, low-friction, high-converting invitation.",
    owner: "amit",
    createdBy: "Amit Shelly",
    isSystem: false,
    htmlContent: generateAmitEmailHtml({
      personaBadge: "EXECUTIVE DISCOVERY",
      sequenceBadge: "Conversion Milestone",
      leadParagraph: "I've shared a few thoughts over the last couple of weeks around leadership development, coaching and capability building.",
      paragraphs: [
        "Rather than sending another generic company presentation, I'd prefer to understand what leadership challenges {{companyName}} is currently trying to solve.",
        "Based on that conversation, I can share only the most relevant xMonks approach instead of taking you through our entire portfolio.",
        "<strong>Would you be open to a 20-minute conversation next week?</strong>",
        "Happy to work around your schedule.",
      ],
      highlightSentence: "A quick 20-minute discovery call to explore relevant leadership interventions tailored strictly to {{companyName}}'s context.",
      closingNote: "Looking forward to connecting.",
      whatsappMessage: "Hi Amit, Let's schedule that 20-minute conversation for {{companyName}} next week.",
    }),
  },
];
