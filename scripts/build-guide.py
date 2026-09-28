from pathlib import Path
from shutil import copyfile
import re
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4

root=Path(__file__).resolve().parent.parent
out=root/'public'/'OpenProof-Project-and-User-Guide.pdf'
out.parent.mkdir(exist_ok=True)
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='GuideTitle',fontName='Helvetica-Bold',fontSize=25,leading=30,spaceAfter=19,textColor=colors.black))
styles.add(ParagraphStyle(name='GuideHeading',fontName='Helvetica-Bold',fontSize=18,leading=22,spaceAfter=14,textColor=colors.black,keepWithNext=True))
styles.add(ParagraphStyle(name='GuideSub',fontName='Helvetica-Bold',fontSize=11.5,leading=15,spaceBefore=12,spaceAfter=7,textColor=colors.black,keepWithNext=True))
styles.add(ParagraphStyle(name='GuideBody',fontName='Helvetica',fontSize=10,leading=14.5,spaceAfter=9,alignment=TA_LEFT,splitLongWords=True))
styles.add(ParagraphStyle(name='GuideBullet',parent=styles['GuideBody'],leftIndent=12,firstLineIndent=-8,spaceAfter=5))
styles.add(ParagraphStyle(name='GuideCell',fontName='Helvetica',fontSize=8.5,leading=11,spaceAfter=0,splitLongWords=True))
def inline(s):
    s=s.replace('“','"').replace('”','"').replace('’',"'").replace('—','-').replace('–','-')
    s=escape(s)
    s=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',s)
    s=re.sub(r'`(.+?)`',r'<font name="Courier">\1</font>',s)
    s=re.sub(r'(https://[^\s<]+)',r'<link href="\1" color="#245943">\1</link>',s)
    return s
lines=(root/'PROJECT_GUIDE.md').read_text(encoding='utf-8-sig').splitlines()
story=[];i=0
while i<len(lines):
    line=lines[i].strip();i+=1
    if not line:continue
    if line=='---':story.append(PageBreak());continue
    if line.startswith('|'):
        rows=[line]
        while i<len(lines) and lines[i].strip().startswith('|'):rows.append(lines[i].strip());i+=1
        data=[]
        for row in rows:
            if re.fullmatch(r'[| :\-]+',row):continue
            cells=[x.strip() for x in row.strip('|').split('|')]
            data.append([Paragraph(inline(x),styles['GuideCell']) for x in cells])
        width=A4[0]-100
        widths=[width*.34,width*.66] if len(data[0])==2 else [width*.25,width*.34,width*.41]
        table=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
        table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e6ede7')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LINEBELOW',(0,0),(-1,0),.6,colors.HexColor('#acbcae')),('LINEBELOW',(0,1),(-1,-1),.3,colors.HexColor('#dbe1dc'))]))
        story += [table,Spacer(1,12)];continue
    if line.startswith('# '):story.append(Paragraph(inline(line[2:]),styles['GuideTitle']))
    elif line.startswith('## '):story.append(Paragraph(inline(line[3:]),styles['GuideHeading']))
    elif line.startswith('### '):story.append(Paragraph(inline(line[4:]),styles['GuideSub']))
    elif line.startswith('- '):story.append(Paragraph('&#8226; '+inline(line[2:]),styles['GuideBullet']))
    else:story.append(Paragraph(inline(line),styles['GuideBody']))
def footer(canvas,doc):
    canvas.saveState();canvas.setFont('Helvetica',8);canvas.setFillColor(colors.HexColor('#68736d'))
    canvas.drawString(50,28,'OpenProof | Project and user guide | 28 September 2026')
    canvas.drawRightString(A4[0]-50,28,str(doc.page));canvas.restoreState()
SimpleDocTemplate(str(out),pagesize=A4,rightMargin=50,leftMargin=50,topMargin=45,bottomMargin=48,title='OpenProof project and user guide',author='OpenProof',pageCompression=1).build(story,onFirstPage=footer,onLaterPages=footer)
copyfile(out,root/'public'/'OpenProof-Project-and-Demo-Guide.pdf')
print(out)
