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

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from '@mui/material';
import { DialogTitle } from '@percona/ui-lib';
import { Messages } from '../database-form.messages';
import { DatabaseFormCancelDialogProps } from './DatabaseFormCancelDialog.types';

const DatabaseFormCancelDialog = ({
  open,
  onClose,
  onConfirm,
}: DatabaseFormCancelDialogProps) => {
  return (
    <Dialog open={open}>
      <DialogTitle onClose={onClose}>{Messages.dialog.title}</DialogTitle>
      <DialogContent>
        <Typography>{Messages.dialog.content}</Typography>
      </DialogContent>
      <DialogActions>
        <Button autoFocus variant="text" onClick={onClose}>
          {Messages.dialog.reject}
        </Button>
        <Button variant="contained" onClick={onConfirm}>
          {Messages.dialog.accept}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DatabaseFormCancelDialog;
