function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      {steps.map((step, index) => {
        const isActive = currentStep === index;
        const isPast = currentStep > index;

        return (
          <div
            key={step.id}
            className={`flex flex-1 items-center gap-3 rounded-2xl border px-4 py-3 ${
              isActive
                ? "border-pine bg-pine/8"
                : isPast
                  ? "border-moss/40 bg-moss/10"
                  : "border-slate-200 bg-white"
            }`}
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-bold ${
                isActive
                  ? "bg-pine text-white"
                  : isPast
                    ? "bg-moss text-white"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {index + 1}
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">{step.title}</div>
              <div className="text-xs text-slate-500">{step.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StepIndicator;
