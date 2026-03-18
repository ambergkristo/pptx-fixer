import React from "react";

import { UploadResultScreen } from "./UploadResultScreen.ts";
import type { UploadResultViewModel } from "../lib/uploadResultViewModel.ts";

interface UploadResultScreenBoundaryProps {
  viewModel: UploadResultViewModel | null | undefined;
}

export function UploadResultScreenBoundary(props: UploadResultScreenBoundaryProps) {
  if (props.viewModel == null) {
    return null;
  }

  return React.createElement(UploadResultScreen, {
    viewModel: props.viewModel
  });
}
