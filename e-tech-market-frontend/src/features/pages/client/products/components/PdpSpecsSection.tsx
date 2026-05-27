import type { ProductSpecRow } from './PdpShared'

export function PdpSpecsSection({ mergedDisplaySpecs }: { mergedDisplaySpecs: ProductSpecRow[] }) {
  return (
    <div className="pdpSpecsSide">
      <div className="pdpSpecsSection">
        <div className="pdpSpecsHeader">
          <h3 className="pdpSectionTitle">Thông số kỹ thuật</h3>
        </div>

        {mergedDisplaySpecs.length > 0 ? (
          <div className="pdpSpecsTable">
            {Object.entries(
              mergedDisplaySpecs.reduce(
                (acc: Record<string, ProductSpecRow[]>, spec: ProductSpecRow) => {
                  const group = spec.spec_group || 'Thông tin khác'
                  if (!acc[group]) acc[group] = []
                  acc[group].push(spec)
                  return acc
                },
                {} as Record<string, ProductSpecRow[]>,
              )
            ).map(([groupName, groupSpecs], idx) => (
              <div key={idx} className="pdpTableRow">
                <div className="pdpTableKey">{groupName}</div>
                <div className="pdpTableValue">
                  {groupSpecs.map((s, i) => (
                    <div key={i} className="vValueLine">
                      <span className="vInnerKey">{s.spec_key}: </span>
                      <span className="vInnerVal">
                        {s.spec_value} {s.spec_unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="pdpNoData">Chưa có thông số kỹ thuật.</p>
        )}
      </div>
    </div>
  )
}
