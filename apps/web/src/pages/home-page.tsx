import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertCircleIcon,
  CheckIcon,
  InfoIcon,
  MoreHorizontalIcon,
} from 'lucide-react'
import { useHealth } from '@/hooks/use-health'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const students = [
  { login: 'alice', campus: 'Paris', level: 12.4 },
  { login: 'bob', campus: 'Lyon', level: 8.1 },
  { login: 'carol', campus: 'Nice', level: 15.0 },
]

export function HomePage() {
  const { data, isLoading, isError, refetch, isFetching } = useHealth()
  const [progress, setProgress] = useState(42)
  const [campus, setCampus] = useState('paris')
  const [notifications, setNotifications] = useState(true)

  return (
    <main className="page-wrap flex flex-col gap-6 px-4 pb-16 pt-14">
      <Card>
        <CardHeader>
          <CardDescription>BetterIntra</CardDescription>
          <CardTitle className="text-4xl tracking-tight sm:text-5xl">
            Design system playground
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="max-w-2xl text-muted-foreground">
            Showcase shadcn components wired to tweakcn tokens. Toggle dark mode
            in the header — colors come from <code>styles.css</code> only.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge>shadcn</Badge>
            <Badge variant="secondary">tweakcn</Badge>
            <Badge variant="outline">Zod · Zustand</Badge>
            <Badge variant="destructive">destructive</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Architecture check</CardDescription>
          <CardTitle>API health</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert>
            <InfoIcon />
            <AlertTitle>page → hook → lib/api</AlertTitle>
            <AlertDescription>
              Health fetch goes through TanStack Query against <code>/health</code>.
            </AlertDescription>
          </Alert>
          <Separator />
          <div className="flex flex-wrap items-center gap-3">
            {isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : isError ? (
              <Badge variant="destructive">API unreachable</Badge>
            ) : (
              <Badge>{data?.status ?? 'unknown'}</Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Refreshing…' : 'Refetch'}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => toast.success('Toast OK', { description: 'Sonner + tokens' })}
                >
                  Toast
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fire a sonner toast</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="actions">
        <TabsList>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Buttons & menus</CardTitle>
                <CardDescription>Variants, dialog, dropdown</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Open dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Book an evaluation slot</DialogTitle>
                        <DialogDescription>
                          Demo dialog — title is required for a11y.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="slot-note">Note</Label>
                        <Textarea id="slot-note" placeholder="Optional message…" />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                        <Button type="button">Confirm</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="More">
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View profile</DropdownMenuItem>
                        <DropdownMenuItem>Copy login</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">
                          Remove friend
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>People</CardTitle>
                <CardDescription>Avatar + alert variants</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="Demo" />
                    <AvatarFallback>BI</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>AL</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>42</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">alice</p>
                    <p className="text-xs text-muted-foreground">Paris · lvl 12.4</p>
                  </div>
                </div>
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>Correction overdue</AlertTitle>
                  <AlertDescription>
                    Slot expired — open a new evaluation window.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forms" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Inputs</CardTitle>
                <CardDescription>Text, select, slider, progress</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login">Login</Label>
                  <Input id="login" placeholder="your_login" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" placeholder="Tell peers about your stack…" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Campus</Label>
                  <Select value={campus} onValueChange={setCampus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pick a campus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>France</SelectLabel>
                        <SelectItem value="paris">Paris</SelectItem>
                        <SelectItem value="lyon">Lyon</SelectItem>
                        <SelectItem value="nice">Nice</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Level goal · {progress}%</Label>
                  <Slider
                    value={[progress]}
                    onValueChange={(v) => setProgress(v[0] ?? 0)}
                    max={100}
                    step={1}
                  />
                  <Progress value={progress} />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="button" className="w-full">
                  Save preferences
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Choices</CardTitle>
                <CardDescription>Checkbox, switch, radio</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <Checkbox id="terms" defaultChecked />
                  <Label htmlFor="terms">Public slot listing</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="notif"
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                  <Label htmlFor="notif">Push notifications</Label>
                </div>
                <Separator />
                <div className="flex flex-col gap-3">
                  <Label>Preferred evaluation</Label>
                  <RadioGroup defaultValue="peer">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="peer" id="peer" />
                      <Label htmlFor="peer">Peer</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="staff" id="staff" />
                      <Label htmlFor="staff">Staff</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="remote" id="remote" />
                      <Label htmlFor="remote">Remote</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Students</CardTitle>
                <CardDescription>Table + skeleton loading state</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Login</TableHead>
                      <TableHead>Campus</TableHead>
                      <TableHead className="text-right">Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((row) => (
                      <TableRow key={row.login}>
                        <TableCell className="font-medium">{row.login}</TableCell>
                        <TableCell>{row.campus}</TableCell>
                        <TableCell className="text-right">{row.level.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>FAQ</CardTitle>
                <CardDescription>Accordion</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="tokens">
                    <AccordionTrigger>Where are colors defined?</AccordionTrigger>
                    <AccordionContent>
                      Only in <code>src/styles.css</code> (tweakcn). Never hardcode
                      hex in JSX.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="fetch">
                    <AccordionTrigger>Where do API calls live?</AccordionTrigger>
                    <AccordionContent>
                      In <code>lib/api</code>, wrapped by hooks with TanStack Query.
                      Pages compose UI only.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="state">
                    <AccordionTrigger>Zustand vs Query?</AccordionTrigger>
                    <AccordionContent>
                      Zustand = client UI (theme). Query = server state.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => toast.info('Info toast')}
                >
                  <InfoIcon data-icon="inline-start" />
                  Info
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => toast.success('Saved')}
                >
                  <CheckIcon data-icon="inline-start" />
                  Success
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}
