"""
PDF Report Generator
Geração de relatórios PDF para análises de imagens aéreas.
"""

import os
import io
from datetime import datetime
from typing import Dict, Any, Optional, List

from fpdf import FPDF

# Cores do tema Roboroça
COLORS = {
    'primary': (106, 175, 61),      # Verde #6AAF3D
    'secondary': (26, 26, 46),      # Escuro #1A1A2E
    'success': (34, 197, 94),       # Verde sucesso
    'warning': (234, 179, 8),       # Amarelo
    'danger': (239, 68, 68),        # Vermelho
    'text': (55, 65, 81),           # Cinza escuro
    'text_light': (107, 114, 128),  # Cinza claro
    'white': (255, 255, 255),
}


class RoborocaPDF(FPDF):
    """PDF customizado com cabeçalho e rodapé do Roboroça."""

    def __init__(self, project_name: str = "Roboroça"):
        super().__init__()
        self.project_name = project_name
        self.set_auto_page_break(auto=True, margin=25)

    def header(self):
        """Cabeçalho do PDF."""
        # Fundo do cabeçalho
        self.set_fill_color(*COLORS['primary'])
        self.rect(0, 0, 210, 25, 'F')

        # Logo/Nome
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(*COLORS['white'])
        self.set_xy(10, 8)
        self.cell(0, 10, 'ROBOROCA', align='L')

        # Nome do projeto
        self.set_font('Helvetica', '', 10)
        self.set_xy(10, 16)
        self.cell(0, 5, self.project_name, align='L')

        # Data
        self.set_xy(150, 8)
        self.cell(0, 10, datetime.now().strftime('%d/%m/%Y'), align='R')

        # Linha de espaçamento
        self.ln(20)

    def footer(self):
        """Rodapé do PDF."""
        self.set_y(-20)

        # Linha separadora
        self.set_draw_color(*COLORS['primary'])
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())

        # Texto do rodapé
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(*COLORS['text_light'])
        self.cell(0, 10, f'Relatório gerado por Roboroça - Página {self.page_no()}/{{nb}}', align='C')

    def section_title(self, title: str):
        """Adicionar título de seção."""
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(*COLORS['primary'])
        self.cell(0, 10, title, ln=True)
        self.ln(2)

    def subsection_title(self, title: str):
        """Adicionar título de subseção."""
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(*COLORS['text'])
        self.cell(0, 8, title, ln=True)

    def add_metric_box(self, label: str, value: str, color: tuple = None):
        """Adicionar caixa de métrica."""
        if color is None:
            color = COLORS['primary']

        x = self.get_x()
        y = self.get_y()

        # Caixa de fundo
        self.set_fill_color(*color)
        self.set_draw_color(*color)
        self.rect(x, y, 45, 25, 'F')

        # Valor
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(*COLORS['white'])
        self.set_xy(x, y + 3)
        self.cell(45, 10, value, align='C')

        # Label
        self.set_font('Helvetica', '', 8)
        self.set_xy(x, y + 13)
        self.cell(45, 8, label, align='C')

        # Mover cursor
        self.set_xy(x + 50, y)

    def add_text(self, text: str, bold: bool = False):
        """Adicionar texto normal."""
        self.set_font('Helvetica', 'B' if bold else '', 10)
        self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 6, text)
        self.ln(2)

    def add_key_value(self, key: str, value: str):
        """Adicionar par chave-valor."""
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(*COLORS['text_light'])
        self.cell(50, 6, key + ":", align='L')

        self.set_font('Helvetica', '', 10)
        self.set_text_color(*COLORS['text'])
        self.cell(0, 6, str(value), ln=True)

    def add_recommendation(self, rec_type: str, message: str):
        """Adicionar recomendação."""
        # Cores por tipo
        colors = {
            'success': COLORS['success'],
            'warning': COLORS['warning'],
            'alert': COLORS['danger'],
            'info': COLORS['primary'],
        }
        color = colors.get(rec_type, COLORS['primary'])

        x = self.get_x()
        y = self.get_y()

        # Barra lateral colorida
        self.set_fill_color(*color)
        self.rect(x, y, 3, 12, 'F')

        # Texto
        self.set_font('Helvetica', '', 9)
        self.set_text_color(*COLORS['text'])
        self.set_xy(x + 6, y)
        self.multi_cell(0, 5, message)
        self.ln(3)

    def add_simple_bar_chart(self, data: Dict[str, float], title: str = ""):
        """Adicionar gráfico de barras simples."""
        if title:
            self.subsection_title(title)

        max_val = max(data.values()) if data else 1
        bar_height = 8
        max_width = 100

        for label, value in data.items():
            y = self.get_y()

            # Label
            self.set_font('Helvetica', '', 9)
            self.set_text_color(*COLORS['text'])
            self.cell(50, bar_height, label, align='L')

            # Barra
            width = (value / max_val) * max_width if max_val > 0 else 0
            self.set_fill_color(*COLORS['primary'])
            self.rect(60, y + 2, width, bar_height - 4, 'F')

            # Valor
            self.set_xy(165, y)
            self.cell(25, bar_height, f"{value:.1f}%", align='R')

            self.ln(bar_height + 2)


class ReportGenerator:
    """Gerador de relatórios PDF para análises."""

    def __init__(self):
        """Inicializar gerador de relatórios."""
        pass

    def generate(
        self,
        analysis: Any,
        project: Optional[Any] = None,
        image: Optional[Any] = None
    ) -> bytes:
        """
        Gerar relatório PDF completo.

        Args:
            analysis: Objeto Analysis com resultados
            project: Objeto Project (opcional)
            image: Objeto Image (opcional)

        Returns:
            Bytes do arquivo PDF
        """
        project_name = project.name if project else "Projeto Roboroça"

        pdf = RoborocaPDF(project_name)
        pdf.alias_nb_pages()
        pdf.add_page()

        # 1. Resumo Executivo
        self._add_executive_summary(pdf, analysis, project, image)

        # 2. Informações do Projeto
        if project:
            self._add_project_info(pdf, project)

        # 3. Informações da Imagem
        if image:
            self._add_image_info(pdf, image)

        # 4. Resultados da Análise
        self._add_analysis_results(pdf, analysis)

        # 5. Recomendações
        self._add_recommendations(pdf, analysis)

        # Retornar bytes do PDF
        return bytes(pdf.output())

    def _add_executive_summary(
        self,
        pdf: RoborocaPDF,
        analysis: Any,
        project: Optional[Any],
        image: Optional[Any]
    ):
        """Adicionar resumo executivo."""
        pdf.section_title("Resumo Executivo")

        results = analysis.results or {}

        # Métricas principais
        y_start = pdf.get_y()

        # Vegetação
        veg_pct = self._get_vegetation_percentage(results)
        pdf.set_xy(10, y_start)
        pdf.add_metric_box("Vegetação", f"{veg_pct:.0f}%", COLORS['primary'])

        # Saúde
        health = self._get_health_index(results)
        color = COLORS['success'] if health >= 70 else COLORS['warning'] if health >= 40 else COLORS['danger']
        pdf.add_metric_box("Saúde", f"{health:.0f}%", color)

        # Área
        if project and project.area_hectares:
            pdf.add_metric_box("Área", f"{project.area_hectares:.0f} ha", COLORS['secondary'])

        pdf.ln(30)

        # Tipo de análise
        pdf.add_key_value("Tipo de Análise", analysis.analysis_type.replace('_', ' ').title())
        pdf.add_key_value("Data da Análise", analysis.created_at.strftime('%d/%m/%Y %H:%M') if analysis.created_at else "N/A")

        if analysis.processing_time_seconds:
            pdf.add_key_value("Tempo de Processamento", f"{analysis.processing_time_seconds:.2f} segundos")

        pdf.ln(5)

    def _add_project_info(self, pdf: RoborocaPDF, project: Any):
        """Adicionar informações do projeto."""
        pdf.section_title("Informações do Projeto")

        pdf.add_key_value("Nome", project.name)

        if project.description:
            pdf.add_key_value("Descrição", project.description)

        if project.area_hectares:
            pdf.add_key_value("Área Total", f"{project.area_hectares:.2f} hectares")

        if project.latitude and project.longitude:
            pdf.add_key_value("Coordenadas", f"{project.latitude:.6f}, {project.longitude:.6f}")

        pdf.add_key_value("Status", project.status.title() if project.status else "Ativo")
        pdf.add_key_value("Criado em", project.created_at.strftime('%d/%m/%Y') if project.created_at else "N/A")

        pdf.ln(5)

    def _add_image_info(self, pdf: RoborocaPDF, image: Any):
        """Adicionar informações da imagem."""
        pdf.section_title("Informações da Imagem")

        pdf.add_key_value("Arquivo", image.original_filename)

        if image.file_size:
            size_mb = image.file_size / (1024 * 1024)
            pdf.add_key_value("Tamanho", f"{size_mb:.2f} MB")

        if image.width and image.height:
            pdf.add_key_value("Dimensões", f"{image.width} x {image.height} pixels")

        if image.center_lat and image.center_lon:
            pdf.add_key_value("Coordenadas GPS", f"{image.center_lat:.6f}, {image.center_lon:.6f}")

        if image.capture_date:
            pdf.add_key_value("Data de Captura", image.capture_date.strftime('%d/%m/%Y'))

        pdf.add_key_value("Tipo", image.image_type.title() if image.image_type else "Drone")

        pdf.ln(5)

    def _add_analysis_results(self, pdf: RoborocaPDF, analysis: Any):
        """Adicionar resultados da análise."""
        pdf.section_title("Resultados da Análise")

        results = analysis.results or {}

        # Análise de Vegetação
        if 'vegetation_coverage' in results or 'coverage' in results:
            pdf.subsection_title("Cobertura de Vegetação")
            coverage = results.get('vegetation_coverage') or results.get('coverage', {})

            pdf.add_key_value("Percentual de Vegetação", f"{coverage.get('vegetation_percentage', 0):.1f}%")
            pdf.add_key_value("Percentual de Solo", f"{coverage.get('soil_percentage', 0):.1f}%")

            if coverage.get('mean_exg'):
                pdf.add_key_value("Índice ExG Médio", f"{coverage.get('mean_exg'):.3f}")

            pdf.ln(3)

        # Saúde da Vegetação
        if 'vegetation_health' in results or 'health' in results:
            pdf.subsection_title("Saúde da Vegetação")
            health = results.get('vegetation_health') or results.get('health', {})

            pdf.add_key_value("Índice de Saúde", f"{health.get('health_index', 0):.1f}")
            pdf.add_key_value("Vegetação Saudável", f"{health.get('healthy_percentage', 0):.1f}%")
            pdf.add_key_value("Vegetação Moderada", f"{health.get('moderate_percentage', 0):.1f}%")
            pdf.add_key_value("Vegetação Estressada", f"{health.get('stressed_percentage', 0):.1f}%")

            pdf.ln(3)

        # Uso do Solo
        if 'land_use' in results or 'land_use_percentages' in results:
            land_use = results.get('land_use') or results.get('land_use_percentages', {})

            if land_use:
                pdf.subsection_title("Uso do Solo")

                # Gráfico de barras
                chart_data = {
                    k.replace('_', ' ').title(): v
                    for k, v in land_use.items()
                    if isinstance(v, (int, float)) and v > 0
                }

                if chart_data:
                    pdf.add_simple_bar_chart(chart_data)

                pdf.ln(3)

        # Detecções (para análise de vídeo)
        if 'temporal_summary' in results:
            pdf.subsection_title("Resumo Temporal (Vídeo)")
            summary = results['temporal_summary']

            pdf.add_key_value("Frames Analisados", str(summary.get('total_frames_analyzed', 0)))

            veg_summary = summary.get('vegetation', {})
            if veg_summary:
                pdf.add_key_value("Vegetação Média", f"{veg_summary.get('mean_percentage', 0):.1f}%")
                pdf.add_key_value("Vegetação Mín/Máx", f"{veg_summary.get('min_percentage', 0):.1f}% - {veg_summary.get('max_percentage', 0):.1f}%")

                if veg_summary.get('trend'):
                    trend_map = {'increasing': 'Crescente', 'decreasing': 'Decrescente', 'stable': 'Estável'}
                    pdf.add_key_value("Tendência", trend_map.get(veg_summary['trend'], veg_summary['trend']))

            pdf.ln(3)

        # Summary geral
        if 'summary' in results:
            pdf.subsection_title("Resumo Geral")
            summary = results['summary']

            for key, value in summary.items():
                if isinstance(value, (int, float)):
                    formatted = f"{value:.1f}" if isinstance(value, float) else str(value)
                else:
                    formatted = str(value)

                label = key.replace('_', ' ').title()
                pdf.add_key_value(label, formatted)

        pdf.ln(5)

    def _add_recommendations(self, pdf: RoborocaPDF, analysis: Any):
        """Adicionar recomendações."""
        results = analysis.results or {}
        recommendations = results.get('recommendations', [])

        if not recommendations:
            # Gerar recomendações básicas
            recommendations = self._generate_basic_recommendations(results)

        if recommendations:
            pdf.section_title("Recomendações")

            for rec in recommendations:
                if isinstance(rec, dict):
                    rec_type = rec.get('type', 'info')
                    message = rec.get('message', '')
                else:
                    rec_type = 'info'
                    message = str(rec)

                if message:
                    pdf.add_recommendation(rec_type, message)

            pdf.ln(5)

    def _generate_basic_recommendations(self, results: Dict[str, Any]) -> List[Dict[str, str]]:
        """Gerar recomendações básicas baseadas nos resultados."""
        recommendations = []

        # Vegetação
        veg_pct = self._get_vegetation_percentage(results)
        if veg_pct < 30:
            recommendations.append({
                'type': 'warning',
                'message': 'Baixa cobertura vegetal detectada. Recomenda-se verificar a área para possíveis problemas de plantio ou erosão.'
            })
        elif veg_pct > 80:
            recommendations.append({
                'type': 'success',
                'message': 'Excelente cobertura vegetal. A área apresenta boa densidade de vegetação.'
            })

        # Saúde
        health = self._get_health_index(results)
        if health < 50:
            recommendations.append({
                'type': 'warning',
                'message': 'Índice de saúde da vegetação baixo. Recomenda-se inspeção visual para identificar possíveis causas.'
            })
        elif health > 75:
            recommendations.append({
                'type': 'success',
                'message': 'Vegetação apresenta bom índice de saúde geral.'
            })

        if not recommendations:
            recommendations.append({
                'type': 'info',
                'message': 'Análise concluída. Os indicadores estão dentro dos parâmetros normais.'
            })

        return recommendations

    def _get_vegetation_percentage(self, results: Dict[str, Any]) -> float:
        """Extrair percentual de vegetação dos resultados."""
        if 'vegetation_coverage' in results:
            return results['vegetation_coverage'].get('vegetation_percentage', 0)
        if 'coverage' in results:
            return results['coverage'].get('vegetation_percentage', 0)
        if 'summary' in results:
            return results['summary'].get('vegetation_percentage', 0)
        return 0

    def _get_health_index(self, results: Dict[str, Any]) -> float:
        """Extrair índice de saúde dos resultados."""
        if 'vegetation_health' in results:
            return results['vegetation_health'].get('health_index', 0)
        if 'health' in results:
            return results['health'].get('health_index', 0)
        if 'summary' in results:
            return results['summary'].get('health_index', 0)
        return 0
