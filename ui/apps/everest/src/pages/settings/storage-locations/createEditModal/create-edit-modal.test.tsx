import { CreateEditStorageForm } from './create-edit-form';
import { validateInputWithRFC1035 } from 'utils/tests/validate-rfc1035';

vi.mock('hooks/api/namespaces/useNamespaces', () => ({
  useNamespaces: () => ({
    data: [],
    isFetching: false,
  }),
}));

const errors = {
  MIN1_ERROR: 'String must contain at least 1 character(s)',
  MAX22_ERROR: 'String must contain at most 22 character(s)',
  SPECIAL_CHAR_ERROR:
    'The storage name should only contain lowercase letters, numbers and hyphens.',
  START_CHAR_ERROR: "The name shouldn't start with a hyphen or a number.",
  END_CHAR_ERROR: "The name shouldn't end with a hyphen.",
};

validateInputWithRFC1035({
  renderComponent: () => <CreateEditStorageForm isEditMode={false} />,
  suiteName: 'Backup storage modal',
  errors: errors,
});
