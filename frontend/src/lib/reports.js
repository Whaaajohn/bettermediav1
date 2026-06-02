export const REPORT_CATEGORIES = [
  ["harassment", "Harassment", "Bullying, insults, targeted abuse"],
  ["hate", "Hate", "Slurs or attacks on protected groups"],
  ["spam", "Spam or scam", "Fraud, repeated posts, suspicious links"],
  ["sexual", "Sexual content", "Explicit or unsafe sexual content"],
  ["violence", "Threats", "Violence, self-harm, dangerous threats"],
  ["impersonation", "Impersonation", "Fake account or pretending to be someone"],
  ["privacy", "Privacy", "Doxxing or sharing private info"],
  ["other", "Other", "Something else moderation should review"],
];

const targetLabels = {
  user: "profile",
  post: "post",
  comment: "comment",
  message: "message",
  call: "call",
  bug: "bug",
};

function labelForTarget(targetType) {
  return targetLabels[targetType] || targetType || "content";
}

export function promptReport(targetType, targetId) {
  return new Promise((resolve) => {
    const root = document.createElement("div");
    const targetLabel = labelForTarget(targetType);
    root.className =
      "fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md";
    root.innerHTML = `
      <form class="w-full max-w-xl overflow-hidden rounded-2xl border border-cyan-400/15 bg-base-100 shadow-2xl">
        <div class="border-b border-base-300 bg-gradient-to-br from-slate-950 via-base-100 to-cyan-950/30 px-5 py-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">Report ${targetLabel}</p>
              <h2 class="mt-1 text-xl font-bold tracking-tight">Send to moderation</h2>
              <p class="mt-1 text-sm text-base-content/55">Pick the closest reason and add useful context. False reports can be reviewed too.</p>
            </div>
            <button type="button" data-cancel class="grid size-9 shrink-0 place-items-center rounded-full text-base-content/55 transition hover:bg-base-200 hover:text-base-content" aria-label="Close report">×</button>
          </div>
        </div>

        <div class="space-y-4 p-5">
          <div>
            <span class="mb-2 block text-sm font-semibold">Reason category</span>
            <div class="grid gap-2 sm:grid-cols-2">
              ${REPORT_CATEGORIES.map(
                ([value, label, description], index) => `
                  <label class="group flex cursor-pointer gap-3 rounded-xl border border-base-300 bg-base-100 p-3 transition hover:border-cyan-400/30 hover:bg-base-200/45 has-[:checked]:border-cyan-400/60 has-[:checked]:bg-cyan-400/10">
                    <input class="radio radio-primary radio-sm mt-0.5" type="radio" name="category" value="${value}" ${index === 0 ? "checked" : ""} />
                    <span class="min-w-0">
                      <span class="block text-sm font-semibold">${label}</span>
                      <span class="mt-0.5 block text-xs leading-5 text-base-content/50">${description}</span>
                    </span>
                  </label>
                `
              ).join("")}
            </div>
          </div>

          <label class="form-control">
            <span class="label-text mb-1 font-semibold">How serious is it?</span>
            <select name="severity" class="select select-bordered h-11 w-full rounded-xl bg-base-100">
              <option value="medium">Needs moderation review</option>
              <option value="high">Urgent or repeated abuse</option>
              <option value="critical">Immediate safety concern</option>
              <option value="low">Minor issue</option>
            </select>
          </label>

          <label class="form-control">
            <span class="label-text mb-1 font-semibold">What happened?</span>
            <textarea name="reason" class="textarea textarea-bordered min-h-32 rounded-xl bg-base-100 leading-6" maxlength="500" placeholder="Tell admins what happened, who was involved, and what should be checked." required></textarea>
            <span class="mt-1 text-xs text-base-content/45">Reports include the ${targetLabel} id so staff can review the right thing.</span>
          </label>

          <div class="rounded-xl border border-cyan-400/15 bg-cyan-400/10 px-3 py-2 text-xs leading-5 text-base-content/60">
            ModBot may scan this report locally and recommend a warning, mute, restriction, or temporary ban. Full bans still require admin control.
          </div>

          <div class="flex flex-col-reverse gap-2 border-t border-base-300 pt-4 sm:flex-row sm:justify-end">
            <button type="button" data-cancel class="btn btn-ghost rounded-xl">Cancel</button>
            <button class="btn btn-primary rounded-xl">Send report</button>
          </div>
        </div>
      </form>
    `;

    const close = (value) => {
      root.remove();
      resolve(value);
    };

    root.addEventListener("click", (event) => {
      if (event.target === root || event.target.closest("[data-cancel]")) close(null);
    });

    root.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const reason = String(form.get("reason") || "").trim();
      if (!reason) return;
      close({
        targetType,
        targetId,
        category: String(form.get("category") || "other"),
        severity: String(form.get("severity") || "medium"),
        reason,
      });
    });

    document.body.append(root);
    root.querySelector("textarea")?.focus();
  });
}
