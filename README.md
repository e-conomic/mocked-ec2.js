Archived
======
Tech Leads: Repository archived due to inactivity in more than 6 months.
Please remember to add a CODEOWNERS file to the root of the repository when unarchiving.

# mocked-ec2.js

Access fake data to mock AWS EC2 endpoints.

Install:

    > npm install e-conomic/mocked-ec2.js

Usage:

    > var mec2 = require("mocked-ec2.js")
    > mec2.describeInstances.singleInstance()
    { Reservations:
       [ { ReservationId: 'r-a61a8a0b',
           OwnerId: '528578904246',
    ...

## Testing
What if we could somehow ensure the mocked data
is in sync with the real service?
`live-integration-tests.js` contains tests that can be run
to verify the integrity of the mocked data.

You'll need to fill out some variables
and provide credentials via environment variables,
but then the script will create and destroy machines
to verify responses match its fixtures.
It cleans up after itself (even in case of errors)
so it should not leak or corrupt any instances.

(Obviously don't run the script on any CI loops
as it actually hits the EC2 infrastructure)
