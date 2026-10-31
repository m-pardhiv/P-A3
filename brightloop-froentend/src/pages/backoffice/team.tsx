import { useState } from 'react'
import { UserX } from 'lucide-react'
import { api } from '@/api'
import { AsyncView } from '@/components/common/async-view'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableSkeleton } from '@/components/common/skeletons'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSession } from '@/context/portal'
import { useToast } from '@/context/toast'
import { useAsync } from '@/hooks/use-async'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatRelativeDays } from '@/lib/format'
import type { TeamMember } from '@/types'

function TeamContent({ team, onChange }: { team: TeamMember[]; onChange: (m: TeamMember) => void }) {
  const me = useSession()
  const toast = useToast()
  const [deactivating, setDeactivating] = useState<TeamMember | null>(null)

  const apply = async (member: TeamMember, active: boolean) => {
    const updated = await api.setTeamMemberActive(member.id, active)
    onChange(updated)
    toast.success(active ? 'Account reactivated' : 'Account deactivated', `${member.name} ${active ? 'can log in again.' : 'can no longer log in.'}`)
  }

  return (
    <>
      <Card className="overflow-hidden">
        <Table className="min-w-[720px]">
          <TableHeader>
            <tr>
              <TableHead>Team member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead className="text-right">Can log in</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {team.map((m, i) => (
              <TableRow key={m.id} index={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} className="size-9 text-xs" />
                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {m.name} {m.id === me.id && <span className="text-xs font-medium text-muted-foreground">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge tone={m.role === 'admin' ? 'brand' : 'neutral'} className="capitalize">
                    {m.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatRelativeDays(m.lastActive)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Switch
                      checked={m.active}
                      disabled={m.id === me.id}
                      aria-label={`${m.name} can log in`}
                      onCheckedChange={(on) => (on ? void apply(m, true) : setDeactivating(m))}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(o) => !o && setDeactivating(null)}
        title={`Deactivate ${deactivating?.name}?`}
        description="They won’t be able to log in until you reactivate the account. Their history is kept."
        confirmLabel="Deactivate"
        cancelLabel="Keep active"
        tone="destructive"
        icon={<UserX className="size-5" />}
        onConfirm={async () => {
          if (deactivating) await apply(deactivating, false)
        }}
      />
    </>
  )
}

export default function TeamPage() {
  useDocumentTitle('Team')
  const { state, reload, setData } = useAsync(() => api.listTeam())
  return (
    <AsyncView
      state={state}
      onRetry={reload}
      skeleton={
        <Card>
          <TableSkeleton rows={4} cols={4} />
        </Card>
      }
    >
      {(team) => <TeamContent team={team} onChange={(u) => setData((all) => all.map((m) => (m.id === u.id ? u : m)))} />}
    </AsyncView>
  )
}
