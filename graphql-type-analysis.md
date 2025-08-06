# GraphQL Type Analysis for UpWork API Job Details

## Overview
This document provides a comprehensive analysis of the GraphQL types discovered through introspection of the UpWork API, specifically for job posting details.

## Type Hierarchy

### MarketplaceJobPosting (Main Type)
The root type for job postings with the following direct fields:

- `id: ID` - Unique identifier for the job posting
- `workFlowState: MarketplacePostingWorkFlowState` - Current state of the job posting
- `canClientReceiveContractProposal: Boolean` - Indicates whether client can receive contract proposals
- `ownership: MarketplacePostingOwnership` - Company/team ownership information
- `annotations: MarketplacePostingAnnotations` - Tags and custom fields
- `activityStat: MarketplacePostingActivityStat` - Job activity and bid statistics
- `content: MarketplaceJobPostingContent` - Title and description
- `attachments: MarketplacePostingAttachment` - File attachments
- `classification: MarketplacePostingClassification` - Categories, skills, occupation
- `segmentationData: MarketplaceSegmentationData` - Segmentation information
- `contractTerms: MarketplaceContractTerms` - Contract details and budget
- `contractorSelection: MarketplaceContractorSelection` - Requirements and qualifications
- `additionalSearchInfo: MarketplaceAdditionalSearchInfo` - Additional search metadata
- `clientCompanyPublic: MarketplacePublicCompanyInfo` - Public company information
- `clientProposals: ClientProposalsConnection` - Client proposals (paginated)
- `customFields: CustomFieldsConnection` - Custom fields (paginated)

## Detailed Field Mappings

### 1. MarketplaceJobPostingContent
Basic job information:
- `title: String` - Job title
- `description: String` - Job description

### 2. MarketplacePostingClassification
Job categorization and skill requirements:
- `category: JobCategory` - Primary job category
- `subCategory: JobCategory` - Job subcategory
- `occupation: Occupation` - Occupation classification
- `skills: Skill` - Required skills
- `additionalSkills: Skill` - Additional/preferred skills

### 3. MarketplaceContractTerms
Contract and budget details:
- `contractStartDate: String` - Start date (ISO-8601 format)
- `contractEndDate: String` - End date (ISO-8601 format)
- `contractType: ContractType` - Type of contract (fixed/hourly)
- `onSiteType: OnSiteType` - Remote/onsite requirements
- `personsToHire: Int` - Number of people to hire
- `experienceLevel: ExperienceLevel` - Required experience level
- `notSurePersonsToHire: Boolean` - Client unsure about number to hire
- `notSureExperiencelevel: Boolean` - Client unsure about experience level
- `fixedPriceContractTerms: FixedPriceContractTerms` - Fixed price details
- `hourlyContractTerms: HourlyContractTerms` - Hourly rate details

#### 3.1 FixedPriceContractTerms
- `amount: Money` - Fixed contract amount
- `maxAmount: Money` - Maximum contract amount
- `engagementDuration: EngagementDuration` - Expected project duration

#### 3.2 HourlyContractTerms
- `engagementDuration: EngagementDuration` - Project duration
- `engagementType: EngagementType` - Full-time/part-time
- `notSureProjectDuration: Boolean` - Client unsure about duration
- `hourlyBudgetType: JobPostingHourlyBudgetType` - Budget type
- `hourlyBudgetMin: Float` - Minimum hourly rate
- `hourlyBudgetMax: Float` - Maximum hourly rate

### 4. MarketplaceContractorSelection
Contractor requirements and qualifications:
- `proposalRequirement: MarketplaceProposalRequirements` - Proposal requirements
- `qualification: MarketplaceQualification` - Required qualifications
- `location: MarketplaceLocation` - Location requirements

#### 4.1 MarketplaceProposalRequirements
- `coverLetterRequired: Boolean` - Cover letter requirement
- `freelancerMilestonesAllowed: Boolean` - Whether freelancer can propose milestones
- `screeningQuestions: MarketplaceQuestion` - Screening questions

### 5. MarketplacePostingOwnership
Company and team information:
- `company: GenericOrganization` - Company details
- `team: GenericOrganization` - Team details

### 6. MarketplacePublicCompanyInfo
Public information about the hiring company:
- `id: ID` - Company identifier
- `legacyType: OrganizationLegacyType` - Legacy organization type
- `teamsEnabled: Boolean` - Whether teams are enabled
- `canHire: Boolean` - Whether company can hire
- `hidden: Boolean` - Whether company profile is hidden
- `country: Country` - Company country
- `state: String` - Company state
- `city: String` - Company city
- `timezone: String` - Company timezone
- `accountingEntity: String` - Accounting entity information
- `billingType: BillingType` - Billing type
- `paymentVerification: PaymentVerificationResult` - Payment verification status
- `agencyDetails: AgencyDetails` - Agency-specific details

### 7. MarketplacePostingActivityStat
Job activity and bidding statistics:
- `applicationsBidStats: ApplicationsBidStats` - Bid statistics
- `jobActivity: JobActivity` - Job activity metrics

#### 7.1 ApplicationsBidStats
- `avgRateBid: Money` - Average bid rate
- `minRateBid: Money` - Minimum bid rate
- `maxRateBid: Money` - Maximum bid rate
- `avgInterviewedRateBid: Money` - Average rate of interviewed candidates

#### 7.2 JobActivity
- `lastClientActivity: String` - Last client activity timestamp
- `invitesSent: Int` - Number of invites sent
- `totalInvitedToInterview: Int` - Total invited to interview
- `totalHired: Int` - Total hired
- `totalUnansweredInvites: Int` - Total unanswered invites
- `totalOffered: Int` - Total offers made
- `totalRecommended: Int` - Total recommendations

### 8. MarketplacePostingAnnotations
Tags and custom field data:
- `tags: String` - Job tags
- `customFields: StringMapElement` - Custom field data

## Usage Notes

1. **Nested Types**: Many fields reference other complex types that may need separate introspection
2. **Pagination**: Some fields like `clientProposals` and `customFields` use connection patterns for pagination
3. **Optional Fields**: Not all jobs will have all fields populated
4. **Permissions**: Some fields may require specific permissions to access

## Recommended Query Strategy

When querying for job details, consider:
1. Always include basic content (title, description)
2. Include contract terms for budget information
3. Include activity stats for competitive analysis
4. Include classification for skill matching
5. Use fragments for reusable field selections
6. Handle pagination for connection fields