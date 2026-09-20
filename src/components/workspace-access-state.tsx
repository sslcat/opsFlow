import { Card, Icon } from "./ui"
import { WorkspaceOrganizationSwitcher } from "./workspace-organization-switcher"

export function WorkspaceAccessState() {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <span className="mx-auto mb-5 flex w-fit rounded-2xl bg-indigo-50 p-4 text-indigo-600">
        <Icon name="shield" className="h-7 w-7" />
      </span>
      <h1 className="text-xl font-semibold">Workspace access required</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Select an organization to open this page. If an organization is already
        selected, ask your OpsFlow administrator for the required business
        access, or switch to an organization you can access.
      </p>
      <div className="mt-6 flex justify-center">
        <WorkspaceOrganizationSwitcher />
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500">
        No organization listed? Ask your administrator for an invitation.
      </p>
    </Card>
  )
}
