{businesses.map((biz) => {
  const bizPlan = plans.find((p) => p.id === biz.subscription_plan);
  const planPrice = Number(bizPlan?.price_awg || 0);

  const activeAddonSubs = businessAddonSubscriptions.filter(
    (sub) => sub.business_id === biz.id && sub.status === "active" && sub.payment_status === "approved"
  );

  const addonTotal = activeAddonSubs.reduce((total, sub) => {
    const addon = Array.isArray(sub.subscription_addons) ? sub.subscription_addons[0] : sub.subscription_addons;
    return total + (Number(addon?.monthly_price_awg || 0) * Number(sub.quantity || 1));
  }, 0);

  const totalSubscription = planPrice + addonTotal;

  return (
  <TableRow key={biz.id}>
    <TableCell className="font-semibold">{biz.business_name}</TableCell>
    <TableCell>{new Date(biz.created_at).toLocaleDateString()}</TableCell>
    <TableCell>
      <Badge 
        variant={biz.status === "active" ? "default" : biz.status === "pending" ? "secondary" : "destructive"}
      >
        {biz.status.toUpperCase()}
      </Badge>
    </TableCell>
    <TableCell>
      <div className="uppercase font-mono font-bold text-xs">{biz.subscription_plan || "None"}</div>
      {biz.trial_end && plans.find(p => p.id === biz.subscription_plan)?.is_trial && (
        <div className="text-[10px] mt-1.5 flex flex-col gap-0.5">
          <span className="text-muted-foreground">Start: {new Date(biz.trial_start).toLocaleDateString()}</span>
          {new Date() > new Date(biz.trial_end) ? (
            <span className="text-destructive font-semibold">Expired: {new Date(biz.trial_end).toLocaleDateString()}</span>
          ) : (
            <span className="text-indigo-600 font-semibold">Ends: {new Date(biz.trial_end).toLocaleDateString()}</span>
          )}
        </div>
      )}
    </TableCell>
    <TableCell className="font-semibold text-foreground">
      {bizPlan ? `AWG ${planPrice.toFixed(2)}` : "-"}
    </TableCell>
    <TableCell>
      {activeAddonSubs.length > 0 ? (
        <div className="flex flex-col gap-1">
          {activeAddonSubs.map(sub => {
            const addon = Array.isArray(sub.subscription_addons) ? sub.subscription_addons[0] : sub.subscription_addons;
            const addedCapacity = Number(addon?.capacity_amount || 0) * Number(sub.quantity || 1);
            return (
              <span key={sub.id} className="text-xs text-muted-foreground whitespace-nowrap">
                {sub.cancel_at_period_end && <Clock className="inline w-3 h-3 text-amber-500 mr-1" title="Cancels at period end" />}
                +{addedCapacity.toLocaleString()} Customers
              </span>
            );
          })}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">None</span>
      )}
    </TableCell>
    <TableCell className="text-foreground">
      {activeAddonSubs.length > 0 ? `AWG ${addonTotal.toFixed(2)}` : "-"}
    </TableCell>
    <TableCell className="font-bold text-primary whitespace-nowrap">
      AWG {totalSubscription.toFixed(2)} / month
    </TableCell>
    <TableCell className="text-right flex items-center justify-end gap-2">
      <select
        className="text-xs border rounded px-2 py-1 mr-2 bg-background"
        value={biz.subscription_plan || ""}
        onChange={(e) => handlePlanAssignment(biz.id, e.target.value)}
        disabled={assigningPlanId === biz.id}
      >
        <option value="">No Plan</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        size="sm"
        className="gap-1 text-xs"
        onClick={() => {
          const newStatus = biz.status === "active" ? "suspended" : "active";
          handleToggleBusinessStatus(biz.id, newStatus);
        }}
      >
        {biz.status === "active" ? <Ban className="h-3.5 w-3.5 text-amber-500" /> : <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
        {biz.status === "active" ? "Suspend" : "Activate"}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="gap-1 text-xs"
        onClick={() => setBusinessToDelete(biz)}
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>
    </TableCell>
  </TableRow>
  );
})}
{businesses.length === 0 && (
