# Task: approval workflow

## Natural language description

Implement an “approval request” workflow. The actor must authenticate with username and password, then supply a `request_id` that identifies the pending item to approve or reject. The system validates identity and resolves the request handle. When the workflow finishes successfully, it reaches a terminal state meaning the approval decision has been recorded (approve/reject details may live outside this minimal contract).

## Expected behavior

- Required inputs: `username`, `password`, `request_id`.
- Authentication must succeed before the request handle is considered valid.
- Successful completion is represented by a single terminal outcome equivalent to “DecisionComplete”.
- The workflow does not specify UI layout; only the logical gates and result name.
