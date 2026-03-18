import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { UploadResultScreenBoundary } from "../apps/product-shell-ui/src/components/UploadResultScreenBoundary.ts";

test("renders nothing at the usage boundary when no view model is available", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreenBoundary, { viewModel: null })
  );

  assert.equal(markup, "");
});
