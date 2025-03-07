import { CreateEditEndpointModal } from './create-edit-modal';
import { validateInputWithRFC1035 } from 'utils/tests/validate-rfc1035';

vi.mock('hooks/rbac/rbac.ts', () => ({
  useNamespacePermissionsForResource: () => ({
    canRead: true,
    canUpdate: true,
    canCreate: true,
    canDelete: true,
    isFetching: false,
  }),
}));

const errors = {
  MIN1_ERROR: 'String must contain at least 1 character(s)',
  MAX22_ERROR: 'String must contain at most 22 character(s)',
  SPECIAL_CHAR_ERROR:
    'The endpoint name should only contain lowercase letters, numbers and hyphens.',
  START_CHAR_ERROR: "The name shouldn't start with a hyphen or a number.",
  END_CHAR_ERROR: "The name shouldn't end with a hyphen.",
};

validateInputWithRFC1035({
  renderComponent: () => (
    <CreateEditEndpointModal
      open={true}
      handleClose={vi.fn()}
      handleSubmit={vi.fn()}
    />
  ),
  suiteName: 'Monitoring endpoint modal',
  errors: errors,
});
