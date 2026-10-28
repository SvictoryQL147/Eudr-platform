"use client";

import { MapPin, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DocumentList, UploadDocumentButton } from "@/components/Documents";
import FarmMap from "@/components/Map";
import FarmerForm from "@/components/FarmerForm";
import { Badge, Button, Card, CardHeader, ErrorBox, LinkButton, Loading, PageHeader, Table, Td } from "@/components/kit";
import { ha, kg } from "@/lib/format";
import type { DocumentItem, Farm, Farmer } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export default function FarmerDetail({ params }: { params: { id: string } }) {
  const farmer = useApi<Farmer>(`/api/v1/farmers/${params.id}`);
  const farms = useApi<Farm[]>(`/api/v1/farms?farmer_id=${params.id}`);
  const docs = useApi<DocumentItem[]>(`/api/v1/documents?linked_to_id=${params.id}`);
  const [editing, setEditing] = useState(false);

  if (farmer.loading && !farmer.data) return <Loading />;
  if (farmer.error) return <ErrorBox message={farmer.error} />;
  const f = farmer.data!;
  const mapped = (farms.data || []).filter((x) => x.polygon_ring);

  return (
    <>
      <PageHeader
        back={{ href: "/farmers", label: "Farmers" }}
        title={f.full_name}
        subtitle={[f.community, f.state].filter(Boolean).join(", ") || "Location not recorded"}
        actions={
          <>
            <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <LinkButton href={`/farms?new=1&farmer=${f.id}`} variant="primary" icon={<Plus className="h-4 w-4" />}>
              Add farm
            </LinkButton>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Details" />
          <dl className="divide-y divide-border text-sm">
            {[
              ["Phone", f.phone_number || "—"],
              ["ID number", f.national_id_number ? f.national_id_number : <Badge tone="orange">Missing — needed for compliance</Badge>],
              ["Community", f.community || "—"],
              ["State", f.state || "—"],
              ["Farms", `${f.mapped_farm_count} of ${f.farm_count} mapped`],
              ["Total area", ha(f.total_hectares)],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-4 px-5 py-2.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Farms" subtitle={`${farms.data?.length ?? 0} registered`} />
          {mapped.length > 0 && (
            <div className="p-4 pb-0">
              <FarmMap height={260} satellite shapes={mapped.map((x) => ({ id: x.id, ring: x.polygon_ring!, label: x.name || "Farm", href: `/farms/${x.id}` }))} />
            </div>
          )}
          {farms.data && farms.data.length ? (
            <Table head={["Farm", "Boundary", "Area", "Collected"]}>
              {farms.data.map((fm) => (
                <tr key={fm.id} className="hover:bg-secondary">
                  <Td>
                    <Link href={`/farms/${fm.id}`} className="font-medium text-foreground hover:text-primary">
                      {fm.name || fm.id.slice(0, 8)}
                    </Link>
                  </Td>
                  <Td>{fm.has_geolocation ? <Badge tone="green">Mapped</Badge> : <Badge tone="red">Not mapped</Badge>}</Td>
                  <Td className="tabular-nums">{ha(fm.area_hectares)}</Td>
                  <Td className="tabular-nums">{kg(fm.collected_kg)}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <div className="flex items-center gap-3 px-5 py-6 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> No farms yet. Add one and map its boundary.
            </div>
          )}
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader
            title="Documents"
            subtitle="ID card, land title or tenure letter"
            action={<UploadDocumentButton linkedType="farmer" linkedId={f.id} onUploaded={docs.reload} />}
          />
          <DocumentList docs={docs.data} empty="No documents for this farmer yet." />
        </Card>
      </div>
      {editing && <FarmerForm open farmer={f} onClose={() => setEditing(false)} onSaved={() => farmer.reload()} />}
    </>
  );
}
