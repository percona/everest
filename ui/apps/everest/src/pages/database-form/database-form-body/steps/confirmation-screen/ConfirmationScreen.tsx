// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Stack, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Messages } from './ConfirmationScreen.messages';
import { useDatabasePageMode } from '../../../useDatabasePageMode';

const ConfirmationScreen = () => {
  const mode = useDatabasePageMode();

  return (
    <Stack alignItems="center">
      <Stack direction="row" alignItems="center">
        <CheckCircleOutlineIcon
          sx={{ color: 'success.contrastText', fontSize: 64, mr: 1 }}
        />
        <Stack direction="column">
          <Typography variant="h6">
            {mode === 'new' ? Messages.dbBeingCreated : Messages.dbBeingUpdated}
          </Typography>
          {mode === 'new' && (
            <Typography variant="caption">{Messages.sitTight}</Typography>
          )}
        </Stack>
      </Stack>
      <Button
        variant="outlined"
        component={Link}
        to="/databases"
        size="small"
        sx={{ mt: 4 }}
        data-testid="db-wizard-goto-db-clusters"
      >
        {Messages.goToList}
      </Button>
    </Stack>
  );
};

export default ConfirmationScreen;
