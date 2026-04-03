# Benchmark task: Customer onboarding (B2B)

## Natural language description

A **new business customer** completes an onboarding form: work email, company name, job title, and explicit acceptance of the current **terms of service** (version string + timestamp of acceptance). The system must **record** these fields, reject incomplete submissions, and hand off to **provisioning or compliance review** before the account is fully activated. Password here models a **chosen account credential** aligned with your auth story.

## Expected behavior summary

- **Required fields:** email, credential (password), company, role/title, terms version, acceptance timestamp.
- **Compliance:** Terms acceptance must be attributable (version + time); downstream provisioning is out of scope for this comparator but the **intent** must be unambiguous in the spec.
- **No silent partial saves:** Missing required data should not produce a “complete” onboarding record.
