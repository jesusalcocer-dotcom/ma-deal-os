/**
 * Synthetic Stock Purchase Agreement template.
 * Used for v1 generation (template selection).
 * Structured as provision segments that can be individually processed.
 */
export interface TemplateSection {
  provision_code: string;
  title: string;
  article: string;
  text: string;
}

export const SPA_TEMPLATE_SECTIONS: TemplateSection[] = [
  {
    provision_code: 'preamble',
    title: 'Preamble',
    article: 'PREAMBLE',
    text: `STOCK PURCHASE AGREEMENT

This Stock Purchase Agreement (this "Agreement") is entered into as of [DATE], by and among [BUYER_NAME] (the "Buyer"), [SELLER_NAME] (the "Seller"), and [TARGET_NAME] (the "Company").

RECITALS

WHEREAS, the Seller owns all of the issued and outstanding shares of capital stock of the Company (the "Shares"); and

WHEREAS, the Seller desires to sell to the Buyer, and the Buyer desires to purchase from the Seller, all of the Shares, upon the terms and subject to the conditions set forth herein;

NOW, THEREFORE, in consideration of the mutual covenants and agreements hereinafter set forth and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:`,
  },
  {
    provision_code: 'purchase_price.base',
    title: 'Purchase and Sale; Purchase Price',
    article: 'ARTICLE I',
    text: `ARTICLE I
PURCHASE AND SALE

Section 1.1 Purchase and Sale of Shares. Upon the terms and subject to the conditions set forth in this Agreement, at the Closing, the Seller shall sell, assign, transfer and deliver to the Buyer, and the Buyer shall purchase, acquire and accept from the Seller, all of the Shares, free and clear of all Liens, for the consideration specified in Section 1.2.

Section 1.2 Purchase Price. The aggregate purchase price for the Shares shall be [DEAL_VALUE] (the "Base Purchase Price"), subject to adjustment as set forth in Section 1.3 (as adjusted, the "Purchase Price"). The Purchase Price shall be paid by the Buyer to the Seller at the Closing by wire transfer of immediately available funds to an account designated by the Seller.

Section 1.3 Purchase Price Adjustments.
(a) Estimated Closing Statement. Not later than three (3) Business Days prior to the Closing Date, the Seller shall prepare and deliver to the Buyer a written statement (the "Estimated Closing Statement") setting forth the Seller's good faith estimate of (i) the Closing Working Capital and (ii) the resulting adjustment to the Base Purchase Price.

(b) Post-Closing Adjustment. Within ninety (90) days after the Closing Date, the Buyer shall prepare and deliver to the Seller a written statement (the "Closing Statement") setting forth the Buyer's calculation of the Closing Working Capital. If the Closing Working Capital exceeds the Working Capital Target, the Purchase Price shall be increased dollar-for-dollar by such excess. If the Working Capital Target exceeds the Closing Working Capital, the Purchase Price shall be decreased dollar-for-dollar by such excess.`,
  },
  {
    provision_code: 'purchase_price.escrow',
    title: 'Escrow',
    article: 'ARTICLE I (cont.)',
    text: `Section 1.4 Escrow.
(a) At the Closing, the Buyer shall deposit, or cause to be deposited, an amount equal to [ESCROW_AMOUNT] (the "Escrow Amount") with [ESCROW_AGENT] (the "Escrow Agent"), to be held in an escrow account (the "Escrow Account") pursuant to the terms of an escrow agreement substantially in the form attached hereto as Exhibit A (the "Escrow Agreement").

(b) The Escrow Amount shall serve as security for the Seller's indemnification obligations under Article VII and for any downward Purchase Price adjustment pursuant to Section 1.3. The Escrow Amount shall be released in accordance with the terms of the Escrow Agreement.`,
  },
  {
    provision_code: 'purchase_price.earnout',
    title: 'Earnout',
    article: 'ARTICLE I (cont.)',
    text: `Section 1.5 Earnout.
(a) In addition to the Base Purchase Price, the Seller shall be entitled to receive additional consideration (the "Earnout Payments") based on the performance of the Company during the Earnout Period, as follows:

(i) If the Company achieves Revenue of at least [EARNOUT_TARGET_1] during the first Earnout Year, the Buyer shall pay to the Seller an amount equal to [EARNOUT_AMOUNT_1].
(ii) If the Company achieves Revenue of at least [EARNOUT_TARGET_2] during the second Earnout Year, the Buyer shall pay to the Seller an amount equal to [EARNOUT_AMOUNT_2].

(b) The Buyer shall operate the Company in good faith during the Earnout Period and shall not take any action with the primary purpose of avoiding or reducing any Earnout Payment.`,
  },
  {
    provision_code: 'closing.mechanics',
    title: 'Closing',
    article: 'ARTICLE II',
    text: `ARTICLE II
THE CLOSING

Section 2.1 Closing. The closing of the transactions contemplated by this Agreement (the "Closing") shall take place remotely via the electronic exchange of documents and signatures on the third (3rd) Business Day following the satisfaction or waiver of all conditions to the obligations of the parties to consummate the transactions contemplated hereby (other than conditions which by their nature are to be satisfied at the Closing), or at such other place, time and date as shall be agreed upon in writing by the Buyer and the Seller (the "Closing Date").

Section 2.2 Deliveries at Closing. At the Closing:
(a) The Seller shall deliver to the Buyer: (i) stock certificates representing all of the Shares, duly endorsed in blank or accompanied by stock powers duly executed in blank; (ii) the officer's certificates described in Section 6.3; and (iii) such other documents as the Buyer may reasonably request.

(b) The Buyer shall deliver to the Seller: (i) the Purchase Price by wire transfer of immediately available funds; (ii) the officer's certificates described in Section 6.3; and (iii) such other documents as the Seller may reasonably request.`,
  },
  {
    provision_code: 'reps.seller.organization',
    title: 'Representations and Warranties of the Seller',
    article: 'ARTICLE III',
    text: `ARTICLE III
REPRESENTATIONS AND WARRANTIES OF THE SELLER

The Seller hereby represents and warrants to the Buyer that, except as set forth in the Disclosure Schedules:

Section 3.1 Organization and Qualification. The Company is a corporation duly organized, validly existing and in good standing under the laws of the State of [JURISDICTION]. The Company has full corporate power and authority to own, operate and lease its properties and to carry on its business as presently conducted. The Company is duly qualified to do business and is in good standing in each jurisdiction where the ownership or operation of its assets or the conduct of its business requires such qualification, except where the failure to be so qualified would not have a Material Adverse Effect.

Section 3.2 Authority. The Seller has full power and authority to execute and deliver this Agreement and to consummate the transactions contemplated hereby. The execution and delivery of this Agreement and the consummation of the transactions contemplated hereby have been duly authorized by all necessary action on the part of the Seller. This Agreement has been duly executed and delivered by the Seller and constitutes the legal, valid and binding obligation of the Seller, enforceable against the Seller in accordance with its terms.

Section 3.3 Capitalization. The authorized capital stock of the Company consists solely of the Shares. All of the Shares are duly authorized, validly issued, fully paid and non-assessable. The Seller is the record and beneficial owner of all of the Shares, free and clear of all Liens.`,
  },
  {
    provision_code: 'reps.seller.financial_statements',
    title: 'Financial Statements',
    article: 'ARTICLE III (cont.)',
    text: `Section 3.4 Financial Statements. The Seller has delivered to the Buyer true and complete copies of (a) the audited balance sheet of the Company as of December 31 of each of the two most recent fiscal years, and the related audited statements of income and cash flows for such years, and (b) the unaudited balance sheet of the Company as of the most recent month-end (the "Latest Balance Sheet Date"), and the related unaudited statements of income and cash flows for the period then ended (collectively, the "Financial Statements"). The Financial Statements have been prepared in accordance with GAAP applied on a consistent basis throughout the periods involved and fairly present in all material respects the financial condition and results of operations of the Company as of the respective dates and for the respective periods indicated.

Section 3.5 No Undisclosed Liabilities. The Company does not have any liabilities or obligations of any nature (whether accrued, absolute, contingent or otherwise) except (a) those set forth or adequately provided for on the Latest Balance Sheet, (b) those incurred in the ordinary course of business consistent with past practice since the Latest Balance Sheet Date, and (c) those that would not, individually or in the aggregate, be material.`,
  },
  {
    provision_code: 'reps.seller.material_contracts',
    title: 'Material Contracts',
    article: 'ARTICLE III (cont.)',
    text: `Section 3.6 Material Contracts.
(a) Section 3.6(a) of the Disclosure Schedules sets forth a complete and accurate list of each of the following Contracts to which the Company is a party or by which the Company or its assets are bound (each, a "Material Contract"): (i) any Contract involving aggregate consideration in excess of $[MATERIALITY_THRESHOLD]; (ii) any Contract relating to Indebtedness; (iii) any Contract with a Governmental Authority; (iv) any Contract that limits or restricts the ability of the Company to compete in any business or in any geographic area; and (v) any Contract with any director, officer or Affiliate of the Company.

(b) Each Material Contract is in full force and effect and is a valid and binding obligation of the Company and, to the Knowledge of the Seller, of each other party thereto. Neither the Company nor, to the Knowledge of the Seller, any other party to any Material Contract is in material breach or default under any Material Contract.`,
  },
  {
    provision_code: 'reps.seller.ip',
    title: 'Intellectual Property',
    article: 'ARTICLE III (cont.)',
    text: `Section 3.7 Intellectual Property.
(a) Section 3.7(a) of the Disclosure Schedules sets forth a complete and accurate list of all Company IP Rights that are registered or subject to applications for registration. The Company owns or has adequate rights to use all Intellectual Property used in or necessary for the conduct of the business as presently conducted.

(b) To the Knowledge of the Seller, the conduct of the business as presently conducted does not infringe, misappropriate or otherwise violate the Intellectual Property rights of any third party. No Action is pending or, to the Knowledge of the Seller, threatened against the Company alleging any such infringement, misappropriation or violation.`,
  },
  {
    provision_code: 'reps.seller.employees',
    title: 'Employee Matters',
    article: 'ARTICLE III (cont.)',
    text: `Section 3.8 Employee Matters.
(a) Section 3.8(a) of the Disclosure Schedules sets forth a complete and accurate list of all employees of the Company, together with each employee's title, date of hire, compensation and benefits.

(b) The Company is not a party to or bound by any collective bargaining agreement or similar agreement with any labor organization. There are no pending or, to the Knowledge of the Seller, threatened labor disputes, strikes, work stoppages or similar labor-related events with respect to any employees of the Company.

(c) The Company is and has been in compliance in all material respects with all applicable Laws relating to labor and employment, including those relating to wages, hours, collective bargaining, discrimination, civil rights, safety and health, workers' compensation and the collection and payment of withholding and/or social security taxes.`,
  },
  {
    provision_code: 'reps.seller.tax',
    title: 'Tax Matters',
    article: 'ARTICLE III (cont.)',
    text: `Section 3.9 Tax Matters.
(a) The Company has timely filed all Tax Returns required to be filed by the Company. All such Tax Returns are true, correct and complete in all material respects.

(b) The Company has timely paid all Taxes due and payable. There are no Liens for Taxes upon any assets of the Company other than Permitted Liens.

(c) There are no pending or, to the Knowledge of the Seller, threatened audits, assessments or other Actions with respect to Taxes of the Company.`,
  },
  {
    provision_code: 'reps.buyer.organization',
    title: 'Representations and Warranties of the Buyer',
    article: 'ARTICLE IV',
    text: `ARTICLE IV
REPRESENTATIONS AND WARRANTIES OF THE BUYER

The Buyer hereby represents and warrants to the Seller that:

Section 4.1 Organization. The Buyer is duly organized, validly existing and in good standing under the laws of its jurisdiction of organization.

Section 4.2 Authority. The Buyer has full power and authority to execute and deliver this Agreement and to consummate the transactions contemplated hereby. This Agreement has been duly executed and delivered by the Buyer and constitutes the legal, valid and binding obligation of the Buyer, enforceable against the Buyer in accordance with its terms.

Section 4.3 Financing. The Buyer has, and at the Closing will have, sufficient cash or available credit facilities to pay the Purchase Price and all other amounts payable by the Buyer hereunder and to consummate the transactions contemplated hereby.`,
  },
  {
    provision_code: 'covenants.interim.ordinary_course',
    title: 'Covenants',
    article: 'ARTICLE V',
    text: `ARTICLE V
COVENANTS

Section 5.1 Conduct of Business. During the period from the date of this Agreement until the Closing (the "Interim Period"), except as otherwise expressly contemplated by this Agreement or as consented to in writing by the Buyer, the Seller shall cause the Company to (a) conduct its business in the ordinary course of business consistent with past practice, (b) use commercially reasonable efforts to preserve substantially intact its business organization and relationships with customers, suppliers and employees, and (c) not take any of the actions described in Section 5.2 without the prior written consent of the Buyer.

Section 5.2 Negative Covenants. During the Interim Period, without the prior written consent of the Buyer (which consent shall not be unreasonably withheld, conditioned or delayed), the Company shall not:
(a) amend its organizational documents;
(b) issue any equity securities or grant any options or warrants;
(c) declare or pay any dividends or distributions;
(d) incur any Indebtedness in excess of $[MATERIALITY_THRESHOLD];
(e) sell, lease or otherwise dispose of any material assets;
(f) enter into, modify or terminate any Material Contract;
(g) increase the compensation of any employee by more than [PERCENTAGE]%; or
(h) agree or commit to do any of the foregoing.`,
  },
  {
    provision_code: 'covenants.regulatory',
    title: 'Regulatory Covenants',
    article: 'ARTICLE V (cont.)',
    text: `Section 5.3 Regulatory Matters. Each party shall use its commercially reasonable efforts to (a) make or cause to be made all filings required under applicable Law in connection with the transactions contemplated by this Agreement, including all filings required under the HSR Act, (b) obtain all required Governmental Approvals, and (c) comply with any conditions imposed by any Governmental Authority in connection with granting such approvals. The parties shall cooperate with each other in connection with the making of such filings and the obtaining of such approvals.`,
  },
  {
    provision_code: 'closing.conditions.reps_true',
    title: 'Conditions to Closing',
    article: 'ARTICLE VI',
    text: `ARTICLE VI
CONDITIONS TO CLOSING

Section 6.1 Conditions to Obligations of Each Party. The obligations of each party to consummate the transactions contemplated by this Agreement shall be subject to the satisfaction, at or prior to the Closing, of the following conditions:
(a) No Governmental Authority shall have enacted, issued, promulgated, enforced or entered any Law or Order that is then in effect and that enjoins or otherwise prohibits the consummation of the transactions contemplated by this Agreement.
(b) All required filings under the HSR Act shall have been made and the applicable waiting period shall have expired or been terminated.

Section 6.2 Conditions to Obligations of the Buyer. The obligations of the Buyer to consummate the transactions contemplated by this Agreement shall be subject to the satisfaction (or waiver by the Buyer), at or prior to the Closing, of the following additional conditions:
(a) The representations and warranties of the Seller set forth in this Agreement shall be true and correct in all material respects as of the Closing Date.
(b) The Seller shall have performed in all material respects all of its obligations under this Agreement required to be performed on or before the Closing Date.
(c) Since the date of this Agreement, no Material Adverse Effect shall have occurred.`,
  },
  {
    provision_code: 'indemnification.basket.type',
    title: 'Indemnification',
    article: 'ARTICLE VII',
    text: `ARTICLE VII
INDEMNIFICATION

Section 7.1 Survival. All representations and warranties contained in this Agreement shall survive the Closing and continue in full force and effect for a period of [SURVIVAL_PERIOD] following the Closing Date; provided that the Fundamental Representations shall survive until the expiration of the applicable statute of limitations (plus sixty (60) days).

Section 7.2 Indemnification by the Seller. Subject to the terms and conditions of this Article VII, from and after the Closing, the Seller shall indemnify the Buyer and its Affiliates, directors, officers, employees and agents (the "Buyer Indemnified Parties") against, and hold them harmless from, any and all Losses incurred or suffered by the Buyer Indemnified Parties arising out of or resulting from (a) any breach or inaccuracy of any representation or warranty made by the Seller in this Agreement, or (b) any breach of any covenant or agreement of the Seller contained in this Agreement.

Section 7.3 Indemnification by the Buyer. Subject to the terms and conditions of this Article VII, from and after the Closing, the Buyer shall indemnify the Seller and its Affiliates, directors, officers, employees and agents (the "Seller Indemnified Parties") against, and hold them harmless from, any and all Losses incurred or suffered by the Seller Indemnified Parties arising out of or resulting from (a) any breach or inaccuracy of any representation or warranty made by the Buyer in this Agreement, or (b) any breach of any covenant or agreement of the Buyer contained in this Agreement.`,
  },
  {
    provision_code: 'indemnification.cap',
    title: 'Indemnification Limits',
    article: 'ARTICLE VII (cont.)',
    text: `Section 7.4 Limitations.
(a) Basket. The Seller shall not be liable for any Losses pursuant to Section 7.2(a) unless the aggregate amount of all such Losses exceeds [BASKET_AMOUNT] (the "Basket Amount"), in which event the Seller shall be liable for all such Losses in excess of the Basket Amount (tipping basket).

(b) Cap. The aggregate amount of all Losses for which the Seller shall be liable pursuant to Section 7.2(a) shall not exceed [CAP_AMOUNT] (the "Cap").

(c) Exceptions. The limitations set forth in Sections 7.4(a) and 7.4(b) shall not apply to Losses arising from (i) fraud or intentional misrepresentation, (ii) breaches of Fundamental Representations, or (iii) the Special Indemnities set forth in Section 7.5.

Section 7.5 Special Indemnities. The Seller shall indemnify the Buyer Indemnified Parties against all Losses arising from the matters set forth on Schedule 7.5, without regard to the Basket Amount or the Cap.`,
  },
  {
    provision_code: 'termination.outside_date',
    title: 'Termination',
    article: 'ARTICLE VIII',
    text: `ARTICLE VIII
TERMINATION

Section 8.1 Termination. This Agreement may be terminated at any time prior to the Closing:
(a) by the mutual written consent of the Buyer and the Seller;
(b) by either the Buyer or the Seller if the Closing shall not have occurred on or before [OUTSIDE_DATE] (the "Outside Date"); provided, that the right to terminate under this Section 8.1(b) shall not be available to any party whose breach of this Agreement has been the principal cause of the failure of the Closing to occur by such date;
(c) by the Buyer if there shall have been a material breach by the Seller of any representation, warranty, covenant or agreement contained in this Agreement that would cause the conditions to Closing set forth in Section 6.2 not to be satisfied, and such breach is not cured within thirty (30) days after written notice;
(d) by the Seller if there shall have been a material breach by the Buyer of any representation, warranty, covenant or agreement contained in this Agreement that would cause the conditions to Closing set forth in Section 6.3 not to be satisfied, and such breach is not cured within thirty (30) days after written notice.

Section 8.2 Effect of Termination. In the event of the termination of this Agreement pursuant to Section 8.1, this Agreement shall forthwith become void and have no effect, without any liability on the part of any party, except that the obligations of the parties in Section 5.4 (Confidentiality), this Section 8.2, and Article IX (Miscellaneous) shall survive any termination of this Agreement.`,
  },
  {
    provision_code: 'mac.definition',
    title: 'Definitions',
    article: 'ARTICLE IX',
    text: `ARTICLE IX
DEFINITIONS AND MISCELLANEOUS

Section 9.1 Definitions. As used in this Agreement, the following terms shall have the following meanings:

"Material Adverse Effect" means any event, change, circumstance, condition, occurrence or effect that, individually or in the aggregate, (a) has had or would reasonably be expected to have a material adverse effect on the business, assets, liabilities, financial condition or results of operations of the Company, or (b) would prevent or materially impair or delay the consummation of the transactions contemplated by this Agreement; provided, however, that none of the following shall be deemed, either alone or in combination, to constitute, and none of the following shall be taken into account in determining whether there has been a Material Adverse Effect: (i) any change in general economic or business conditions; (ii) any change in the financial or securities markets generally; (iii) any change in applicable Law or GAAP; (iv) any change affecting the industry in which the Company operates generally; (v) any natural disaster, pandemic, epidemic, or outbreak of disease; or (vi) the announcement or pendency of the transactions contemplated by this Agreement.`,
  },
  {
    provision_code: 'misc.governing_law',
    title: 'Governing Law and Miscellaneous',
    article: 'ARTICLE IX (cont.)',
    text: `Section 9.2 Governing Law. This Agreement shall be governed by, and construed in accordance with, the laws of the State of [JURISDICTION], without giving effect to any choice or conflict of law provision or rule that would cause the application of the laws of any jurisdiction other than the State of [JURISDICTION].

Section 9.3 Dispute Resolution. Any dispute arising out of or relating to this Agreement shall be submitted to the exclusive jurisdiction of the federal and state courts located in [JURISDICTION], and each party irrevocably submits to the exclusive jurisdiction of such courts.

Section 9.4 Expenses. Except as otherwise expressly provided in this Agreement, each party shall bear its own costs and expenses incurred in connection with this Agreement and the transactions contemplated hereby.

Section 9.5 Entire Agreement. This Agreement, together with the Exhibits and Schedules hereto, constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior negotiations, agreements, understandings and arrangements, both oral and written, between the parties with respect to such subject matter.

Section 9.6 Specific Performance. The parties agree that irreparable damage would occur in the event that any provision of this Agreement were not performed in accordance with its terms, and that the parties shall be entitled to specific performance of the terms hereof, in addition to any other remedy at law or in equity.

[Signature pages follow]`,
  },
];

/**
 * Get the full SPA template as a single text string.
 */
export function getSPATemplateText(): string {
  return SPA_TEMPLATE_SECTIONS.map(s => s.text).join('\n\n');
}

/**
 * Templates available by document type.
 */
export const DOCUMENT_TEMPLATES: Record<string, { name: string; getTemplate: () => string }> = {
  SPA: { name: 'Stock Purchase Agreement', getTemplate: getSPATemplateText },
};
