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
        image: Optional[Any] = None,
        enriched_data: Optional[Dict[str, Any]] = None,
        all_analyses: Optional[List[Any]] = None
    ) -> bytes:
        """
        Gerar relatório PDF completo.

        Args:
            analysis: Objeto Analysis com resultados
            project: Objeto Project (opcional)
            image: Objeto Image (opcional)
            enriched_data: Dados enriquecidos (clima, solo, elevação)
            all_analyses: Lista de todas as análises do projeto

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

        # 3. Dados Ambientais (clima, solo, elevação)
        if enriched_data:
            self._add_environmental_data(pdf, enriched_data)

        # 4. Informações da Imagem
        if image:
            self._add_image_info(pdf, image)

        # 5. Resultados da Análise
        self._add_analysis_results(pdf, analysis)

        # 6. Estatísticas Agregadas (se houver múltiplas análises)
        if all_analyses and len(all_analyses) > 1:
            self._add_aggregated_stats(pdf, all_analyses)

        # 7. Tabela de Detecções YOLO
        self._add_detection_table(pdf, analysis)

        # 8. Recomendações
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
        pdf.section_title("Informacoes do Projeto")

        pdf.add_key_value("Nome", project.name)

        if project.description:
            pdf.add_key_value("Descricao", project.description)

        if project.total_area_ha:
            pdf.add_key_value("Area Total", f"{project.total_area_ha:.2f} hectares")

        if project.latitude and project.longitude:
            pdf.add_key_value("Coordenadas", f"{project.latitude:.6f}, {project.longitude:.6f}")

        pdf.add_key_value("Status", project.status.title() if project.status else "Ativo")
        pdf.add_key_value("Criado em", project.created_at.strftime('%d/%m/%Y') if project.created_at else "N/A")

        pdf.ln(5)

    def _add_environmental_data(self, pdf: RoborocaPDF, enriched_data: Dict[str, Any]):
        """Adicionar dados ambientais (clima, solo, elevação)."""
        pdf.section_title("Dados Ambientais")

        # Coordenadas
        if enriched_data.get('coordinates'):
            coords = enriched_data['coordinates']
            pdf.add_key_value("Latitude", f"{coords.get('latitude', 0):.6f}")
            pdf.add_key_value("Longitude", f"{coords.get('longitude', 0):.6f}")

        # Clima
        weather = enriched_data.get('weather', {})
        if weather and not weather.get('error'):
            pdf.ln(3)
            pdf.subsection_title("Clima Atual")
            current = weather.get('current', {})
            if current.get('weather_description'):
                pdf.add_key_value("Condicao", current['weather_description'])
            if current.get('temperature_c') is not None:
                pdf.add_key_value("Temperatura", f"{current['temperature_c']:.1f} C")
            if current.get('relative_humidity_pct') is not None:
                pdf.add_key_value("Umidade", f"{current['relative_humidity_pct']:.0f}%")
            if current.get('precipitation_mm') is not None:
                pdf.add_key_value("Precipitacao", f"{current['precipitation_mm']:.1f} mm")
            if current.get('wind_speed_kmh') is not None:
                pdf.add_key_value("Vento", f"{current['wind_speed_kmh']:.1f} km/h")

        # Solo
        soil = enriched_data.get('soil', {})
        if soil and not soil.get('error'):
            pdf.ln(3)
            pdf.subsection_title("Caracteristicas do Solo")
            properties = soil.get('properties', {})
            for key in ['phh2o', 'nitrogen', 'soc', 'clay']:
                if key in properties:
                    prop = properties[key]
                    label = prop.get('label', key)
                    depths = prop.get('depths', {})
                    first_depth_val = list(depths.values())[0] if depths else None
                    if first_depth_val is not None:
                        unit = prop.get('unit', '')
                        pdf.add_key_value(label, f"{first_depth_val} {unit}")

            interpretation = soil.get('interpretation')
            if interpretation:
                if isinstance(interpretation, dict):
                    for key, val in interpretation.items():
                        pdf.add_key_value(key.replace('_', ' ').title(), str(val))
                else:
                    pdf.add_text(f"Classificacao: {interpretation}")

        # Elevação
        elevation = enriched_data.get('elevation', {})
        if elevation and not elevation.get('error'):
            pdf.ln(3)
            pdf.subsection_title("Elevacao")
            if elevation.get('elevation_m') is not None:
                pdf.add_key_value("Altitude", f"{elevation['elevation_m']:.0f} metros")
            terrain = elevation.get('terrain_classification', {})
            if terrain:
                if terrain.get('description'):
                    pdf.add_key_value("Terreno", terrain['description'])
                elif terrain.get('category'):
                    pdf.add_key_value("Tipo", terrain['category'])

        # Localização (geocoding)
        geocoding = enriched_data.get('geocoding', {})
        if geocoding and not geocoding.get('error'):
            pdf.ln(3)
            pdf.subsection_title("Localizacao")
            address = geocoding.get('address', {})
            if address.get('city'):
                pdf.add_key_value("Cidade", address['city'])
            if address.get('state'):
                pdf.add_key_value("Estado", address['state'])
            if address.get('country'):
                pdf.add_key_value("Pais", address['country'])
            if geocoding.get('display_name'):
                pdf.add_text(f"Endereco completo: {geocoding['display_name']}")

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

        # Segmentação DeepLabV3
        if 'segmentation' in results:
            pdf.subsection_title("Segmentacao Semantica (DeepLabV3)")
            seg = results['segmentation']

            if seg.get('num_classes_detected'):
                pdf.add_key_value("Classes Detectadas", str(seg['num_classes_detected']))

            if seg.get('category_percentages'):
                chart_data = {
                    k.replace('_', ' ').title(): v
                    for k, v in seg['category_percentages'].items()
                    if isinstance(v, (int, float)) and v > 0
                }
                if chart_data:
                    pdf.add_simple_bar_chart(chart_data)

            pdf.ln(3)

        # Classificação de cena ResNet18
        if 'scene_classification' in results:
            pdf.subsection_title("Classificacao de Cena (ResNet18)")
            scene = results['scene_classification']

            if scene.get('land_use_percentages'):
                chart_data = {
                    k.replace('_', ' ').title(): v
                    for k, v in scene['land_use_percentages'].items()
                    if isinstance(v, (int, float)) and v > 0.5
                }
                if chart_data:
                    # Ordenar por valor decrescente, pegar top 8
                    sorted_data = dict(sorted(chart_data.items(), key=lambda x: x[1], reverse=True)[:8])
                    pdf.add_simple_bar_chart(sorted_data)

            pdf.ln(3)

        # Tipo de vegetação
        if 'vegetation_type' in results:
            pdf.subsection_title("Classificacao de Vegetacao")
            veg_type = results['vegetation_type']

            if veg_type.get('vegetation_type'):
                pdf.add_key_value("Tipo de Vegetacao", str(veg_type['vegetation_type']))
            if veg_type.get('vegetation_density'):
                pdf.add_key_value("Densidade", str(veg_type['vegetation_density']))
            if veg_type.get('confidence') is not None:
                pdf.add_key_value("Confianca", f"{veg_type['confidence'] * 100:.1f}%")

            pdf.ln(3)

        # Detecção de objetos YOLO
        if 'object_detection' in results:
            pdf.subsection_title("Deteccao de Objetos (YOLO)")
            det = results['object_detection']

            if det.get('total_detections') is not None:
                pdf.add_key_value("Total de Deteccoes", str(det['total_detections']))
            if det.get('avg_confidence') is not None:
                pdf.add_key_value("Confianca Media", f"{det['avg_confidence'] * 100:.1f}%")

            if det.get('by_class'):
                chart_data = {
                    k: float(v)
                    for k, v in det['by_class'].items()
                }
                if chart_data:
                    # Apresentar contagem como gráfico
                    max_count = max(chart_data.values()) if chart_data else 1
                    pct_data = {k: (v / max_count) * 100 for k, v in chart_data.items()}
                    pdf.add_simple_bar_chart(pct_data, "Deteccoes por Classe")

            pdf.ln(3)

        # Features visuais
        if 'visual_features' in results:
            pdf.subsection_title("Caracteristicas Visuais")
            features = results['visual_features']

            if features.get('texture'):
                pdf.add_text("Textura:", bold=True)
                for key, val in list(features['texture'].items())[:5]:
                    if isinstance(val, (int, float)):
                        pdf.add_key_value(key.replace('_', ' ').title(), f"{val:.3f}")

            if features.get('patterns') and isinstance(features['patterns'], dict):
                pdf.add_text("Padroes:", bold=True)
                for key, val in list(features['patterns'].items())[:5]:
                    if isinstance(val, (int, float)):
                        pdf.add_key_value(key.replace('_', ' ').title(), f"{val:.3f}")
                    elif isinstance(val, str):
                        pdf.add_key_value(key.replace('_', ' ').title(), val)

            pdf.ln(3)

        # Detecções (para análise de vídeo)
        if 'temporal_summary' in results:
            pdf.subsection_title("Resumo Temporal (Video)")
            summary = results['temporal_summary']

            pdf.add_key_value("Frames Analisados", str(summary.get('total_frames_analyzed', 0)))

            veg_summary = summary.get('vegetation', {})
            if veg_summary:
                pdf.add_key_value("Vegetacao Media", f"{veg_summary.get('mean_percentage', 0):.1f}%")
                pdf.add_key_value("Vegetacao Min/Max", f"{veg_summary.get('min_percentage', 0):.1f}% - {veg_summary.get('max_percentage', 0):.1f}%")

                if veg_summary.get('trend'):
                    trend_map = {'increasing': 'Crescente', 'decreasing': 'Decrescente', 'stable': 'Estavel'}
                    pdf.add_key_value("Tendencia", trend_map.get(veg_summary['trend'], veg_summary['trend']))

            health_summary = summary.get('health', {})
            if health_summary and health_summary.get('mean_index') is not None:
                pdf.add_key_value("Indice de Saude Medio", f"{health_summary['mean_index']:.1f}")

            if summary.get('land_use_average'):
                chart_data = {
                    k.replace('_', ' ').title(): v
                    for k, v in summary['land_use_average'].items()
                    if isinstance(v, (int, float)) and v > 0
                }
                if chart_data:
                    pdf.add_simple_bar_chart(chart_data, "Uso do Solo (Media Temporal)")

            pdf.ln(3)

        # Video info
        if 'video_info' in results:
            pdf.subsection_title("Informacoes do Video")
            vi = results['video_info']

            if vi.get('filename'):
                pdf.add_key_value("Arquivo", str(vi['filename']))
            if vi.get('width') and vi.get('height'):
                pdf.add_key_value("Resolucao", f"{vi['width']}x{vi['height']}")
            if vi.get('fps'):
                pdf.add_key_value("FPS", str(vi['fps']))
            if vi.get('duration_seconds') is not None:
                pdf.add_key_value("Duracao", f"{vi['duration_seconds']:.1f} segundos")
            if vi.get('frame_count'):
                pdf.add_key_value("Total de Frames", str(vi['frame_count']))

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

    def _add_aggregated_stats(self, pdf: RoborocaPDF, all_analyses: List[Any]):
        """Adicionar estatísticas agregadas de múltiplas análises."""
        pdf.section_title("Estatisticas Agregadas")

        # Filtrar apenas análises completas
        completed = [a for a in all_analyses if a.status == 'completed' and a.results]

        if not completed:
            pdf.add_text("Nenhuma analise completa disponivel.")
            pdf.ln(5)
            return

        pdf.add_key_value("Total de Analises", str(len(completed)))

        # Agregar vegetação
        veg_values = []
        health_values = []
        total_detections = 0
        detection_classes: Dict[str, int] = {}

        for analysis in completed:
            results = analysis.results

            # Vegetação
            if 'vegetation_coverage' in results:
                veg_values.append(results['vegetation_coverage'].get('vegetation_percentage', 0))
            elif 'coverage' in results:
                veg_values.append(results['coverage'].get('vegetation_percentage', 0))

            # Saúde
            if 'vegetation_health' in results:
                health_values.append(results['vegetation_health'].get('health_index', 0))
            elif 'health' in results:
                health_values.append(results['health'].get('health_index', 0))

            # Detecções
            if 'object_detection' in results:
                det = results['object_detection']
                total_detections += det.get('total_detections', 0)
                for cls, count in det.get('by_class', {}).items():
                    detection_classes[cls] = detection_classes.get(cls, 0) + count

        if veg_values:
            avg_veg = sum(veg_values) / len(veg_values)
            pdf.add_key_value("Cobertura Vegetal Media", f"{avg_veg:.1f}%")
            pdf.add_key_value("Cobertura Vegetal Min/Max", f"{min(veg_values):.1f}% - {max(veg_values):.1f}%")

        if health_values:
            avg_health = sum(health_values) / len(health_values)
            pdf.add_key_value("Indice de Saude Medio", f"{avg_health:.1f}%")
            pdf.add_key_value("Indice de Saude Min/Max", f"{min(health_values):.1f}% - {max(health_values):.1f}%")

        if total_detections > 0:
            pdf.add_key_value("Total de Objetos Detectados", str(total_detections))

        pdf.ln(5)

    def _add_detection_table(self, pdf: RoborocaPDF, analysis: Any):
        """Adicionar tabela de detecções YOLO."""
        results = analysis.results or {}
        object_detection = results.get('object_detection', {})

        if not object_detection or not object_detection.get('by_class'):
            return

        by_class = object_detection.get('by_class', {})
        if not by_class:
            return

        pdf.section_title("Detalhes das Deteccoes (YOLO)")

        # Info geral
        pdf.add_key_value("Total de Deteccoes", str(object_detection.get('total_detections', 0)))
        if object_detection.get('avg_confidence') is not None:
            pdf.add_key_value("Confianca Media", f"{object_detection['avg_confidence'] * 100:.1f}%")

        pdf.ln(3)
        pdf.subsection_title("Deteccoes por Classe")

        # Ordenar por contagem
        sorted_classes = sorted(by_class.items(), key=lambda x: x[1], reverse=True)

        # Criar tabela
        pdf.set_font('Helvetica', 'B', 10)
        pdf.set_fill_color(*COLORS['secondary'])
        pdf.set_text_color(*COLORS['white'])
        pdf.cell(100, 8, "Classe", border=1, fill=True, align='C')
        pdf.cell(45, 8, "Quantidade", border=1, fill=True, align='C')
        pdf.cell(45, 8, "Porcentagem", border=1, fill=True, align='C')
        pdf.ln()

        pdf.set_font('Helvetica', '', 9)
        pdf.set_text_color(*COLORS['text'])

        total = object_detection.get('total_detections', 1)
        for cls, count in sorted_classes[:15]:  # Top 15
            pct = (count / total) * 100 if total > 0 else 0
            pdf.cell(100, 7, cls.replace('_', ' ').title(), border=1, align='L')
            pdf.cell(45, 7, str(count), border=1, align='C')
            pdf.cell(45, 7, f"{pct:.1f}%", border=1, align='C')
            pdf.ln()

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
        """Gerar recomendações baseadas nos resultados da análise."""
        recommendations = []

        # Vegetação
        veg_pct = self._get_vegetation_percentage(results)
        if veg_pct < 30:
            recommendations.append({
                'type': 'alert',
                'message': 'ALERTA: Baixa cobertura vegetal detectada ({:.1f}%). Recomenda-se verificar a area para possiveis problemas de plantio, pragas, ou erosao do solo. Considere analise presencial imediata.'.format(veg_pct)
            })
        elif veg_pct < 50:
            recommendations.append({
                'type': 'warning',
                'message': 'Cobertura vegetal moderada ({:.1f}%). Monitorar evolucao nas proximas semanas e verificar areas com menor densidade.'.format(veg_pct)
            })
        elif veg_pct > 80:
            recommendations.append({
                'type': 'success',
                'message': 'Excelente cobertura vegetal ({:.1f}%). A area apresenta boa densidade de vegetacao. Manter manejo atual.'.format(veg_pct)
            })

        # Saúde
        health = self._get_health_index(results)
        if health < 40:
            recommendations.append({
                'type': 'alert',
                'message': 'ALERTA: Indice de saude da vegetacao critico ({:.1f}%). Recomenda-se inspecao imediata para identificar causas. Verificar irrigacao, nutricao e presenca de pragas ou doencas.'.format(health)
            })
        elif health < 60:
            recommendations.append({
                'type': 'warning',
                'message': 'Indice de saude moderado ({:.1f}%). Algumas areas podem requerer atencao. Considere ajustes na irrigacao ou fertilizacao.'.format(health)
            })
        elif health > 75:
            recommendations.append({
                'type': 'success',
                'message': 'Vegetacao com bom indice de saude ({:.1f}%). Os indicadores sugerem condicoes adequadas de cultivo.'.format(health)
            })

        # Detecções YOLO
        if 'object_detection' in results:
            det = results['object_detection']
            total = det.get('total_detections', 0)
            if total > 0:
                recommendations.append({
                    'type': 'info',
                    'message': 'Foram detectados {} objetos na area analisada. Verifique o detalhamento por classe para identificar elementos relevantes.'.format(total)
                })

        # Segmentação
        if 'segmentation' in results:
            seg = results['segmentation']
            cat_pct = seg.get('category_percentages', {})
            if cat_pct.get('vegetation', 0) > 0 and cat_pct.get('vegetation', 0) < 20:
                recommendations.append({
                    'type': 'warning',
                    'message': 'A segmentacao indica baixa area de vegetacao na imagem. Considere expandir area de plantio ou verificar cobertura do solo.'
                })

        # Tipo de vegetação
        if 'vegetation_type' in results:
            veg_type = results['vegetation_type']
            if veg_type.get('vegetation_type'):
                recommendations.append({
                    'type': 'info',
                    'message': 'Tipo de vegetacao identificado: {}. Densidade: {}'.format(
                        veg_type.get('vegetation_type', 'N/A'),
                        veg_type.get('vegetation_density', 'N/A')
                    )
                })

        # Se não houver recomendações específicas
        if not recommendations:
            recommendations.append({
                'type': 'info',
                'message': 'Analise concluida. Os indicadores estao dentro dos parametros normais. Continue monitorando a area periodicamente.'
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
