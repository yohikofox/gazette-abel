"""Keep Valérie in the source while allowing ?valerie=0 to hide her in the UI."""

from pathlib import Path
import re
import sys


html_path = Path(sys.argv[1])
html = html_path.read_text(encoding="utf-8")


def insert_once(anchor: str, addition: str) -> None:
    global html
    if addition in html:
        return
    if anchor not in html:
        raise SystemExit(f"Missing anchor: {anchor[:60]}")
    html = html.replace(anchor, addition + anchor, 1)


def replace_once(old: str, new: str) -> None:
    global html
    if new in html:
        return
    if html.count(old) != 1:
        raise SystemExit(f"Expected one source fragment: {old[:60]}")
    html = html.replace(old, new, 1)


insert_once(
    "<style>",
    "<script>if(new URLSearchParams(location.search).get('valerie')==='0')document.documentElement.dataset.hideValerie='true';</script>\n",
)
visibility_css = (
    'html[data-hide-valerie="true"] [data-person="valerie"],'
    'html[data-hide-valerie="true"] [data-sorting-person="valerie"],'
    'html[data-hide-valerie="true"] [data-sorting-print-person="valerie"],'
    'html[data-hide-valerie="true"] [data-partner-link="michel-valerie"]'
    ' { display:none!important; }\n'
)
insert_once("* { box-sizing:border-box; }\n", visibility_css)

partner_svg = re.compile(r'<svg class="genealogy-partners"[^>]*>.*?</svg>', re.S)
triplet = re.compile(
    r'<path class="couple-shadow"[^>]+/>'
    r'<path class="couple-thread"[^>]+/>'
    r'<circle class="couple-seal"[^>]+/>'
)


def annotate_partner(match: re.Match[str]) -> str:
    svg = match.group(0)
    if 'data-partner-link="michel-valerie"' in svg:
        return svg
    links = list(triplet.finditer(svg))
    if len(links) != 10:
        raise SystemExit(f"Expected ten partner links, found {len(links)}")
    target = links[3]
    return (
        svg[: target.start()]
        + '<g data-partner-link="michel-valerie">'
        + target.group(0)
        + "</g>"
        + svg[target.end() :]
    )


if len(partner_svg.findall(html)) != 2:
    raise SystemExit("Expected two genealogy partner overlays")
html = partner_svg.sub(annotate_partner, html)

insert_once(
    "const sortingStoreKey=",
    "const visibleSortingPeople=sortingData.people.filter(person=>document.documentElement.dataset.hideValerie!=='true'||person.id!=='valerie');\n",
)
replace_once(
    "const sortPerson=id=>sortingData.people.find(person=>person.id===id);",
    "const sortPerson=id=>visibleSortingPeople.find(person=>person.id===id);",
)
replace_once(
    "    const person=sortPerson(button.dataset.sortingPerson);\n    const label=sortingName(person);",
    "    const person=sortPerson(button.dataset.sortingPerson);\n    if(!person){button.hidden=true;return}\n    const label=sortingName(person);",
)
replace_once(
    "  const done=Object.keys(sortingAssignments).length;\n"
    "  const remaining=sortingData.people.length-done;\n"
    "  sortingUi.roster.parentElement.querySelectorAll('[data-sorting-print-person]').forEach(span=>{span.hidden=Boolean(sortingAssignments[span.dataset.sortingPrintPerson])});",
    "  const done=visibleSortingPeople.filter(person=>sortingAssignments[person.id]).length;\n"
    "  const remaining=visibleSortingPeople.length-done;\n"
    "  sortingUi.roster.parentElement.querySelectorAll('[data-sorting-print-person]').forEach(span=>{span.hidden=!sortPerson(span.dataset.sortingPrintPerson)||Boolean(sortingAssignments[span.dataset.sortingPrintPerson])});",
)
replace_once(
    "  const button=event.target.closest('[data-sorting-person]');if(!button)return;",
    "  const button=event.target.closest('[data-sorting-person]');if(!button||!sortPerson(button.dataset.sortingPerson))return;",
)
replace_once(
    "  const exportData={version:1,source:'La Gazette d’Abel · cérémonie du Choixpeau',assignments:Object.fromEntries(Object.entries(sortingAssignments).map(([id,value])=>[id,value.house]))};",
    "  const visibleIds=new Set(visibleSortingPeople.map(person=>person.id));\n"
    "  const exportData={version:1,source:'La Gazette d’Abel · cérémonie du Choixpeau',assignments:Object.fromEntries(Object.entries(sortingAssignments).filter(([id])=>visibleIds.has(id)).map(([id,value])=>[id,value.house]))};",
)

html_path.write_text(html, encoding="utf-8")
