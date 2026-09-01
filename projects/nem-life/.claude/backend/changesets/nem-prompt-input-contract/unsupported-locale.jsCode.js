// The report prompt is Dutch-only, so any other locale is logged and alerted instead of
// calling Anthropic. Emits the exact shape Parse Report emits on failure, so Log Failure
// and Alert Failure need no changes.
const p = $('Validate Token').first().json;

return [{
  json: Object.assign({}, p, {
    parseValid: false,
    report: null,
    reason: 'unsupported-locale',
    detail: 'Locale "' + p.locale + '" has no report prompt - only nl is supported. No model call was made.',
    rawResponse: '',
    executionId: String($execution.id),
    failedAt: new Date().toISOString()
  })
}];
