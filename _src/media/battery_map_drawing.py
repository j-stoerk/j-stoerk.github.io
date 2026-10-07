"""Draw in logical coordinates at a higher output resolution."""
from PIL import ImageDraw, ImageFont


class Font:
    def __init__(self, path, size, scale):
        self.scale = scale
        self.pixels = ImageFont.truetype(str(path), round(size * scale))

    def getlength(self, text):
        return self.pixels.getlength(text) / self.scale


class Draw:
    def __init__(self, image, scale):
        self.pixels = ImageDraw.Draw(image)
        self.scale = scale

    def coordinates(self, points):
        if isinstance(points[0], (tuple, list)):
            return [tuple(value * self.scale for value in point) for point in points]
        return tuple(value * self.scale for value in points)

    def line(self, points, fill=None, width=1):
        self.pixels.line(self.coordinates(points), fill=fill,
                         width=max(1, round(width * self.scale)))

    def ellipse(self, box, fill=None, outline=None, width=1):
        self.pixels.ellipse(self.coordinates(box), fill=fill, outline=outline,
                            width=max(1, round(width * self.scale)))

    def polygon(self, points, fill=None):
        self.pixels.polygon(self.coordinates(points), fill=fill)

    def arc(self, box, start, end, fill=None, width=1):
        self.pixels.arc(self.coordinates(box), start, end, fill=fill,
                        width=max(1, round(width * self.scale)))

    def rounded_rectangle(self, box, radius=0, fill=None, outline=None, width=1):
        self.pixels.rounded_rectangle(self.coordinates(box), radius=radius * self.scale,
                                      fill=fill, outline=outline,
                                      width=max(1, round(width * self.scale)))

    def text(self, point, text, font, fill=None, **kwargs):
        self.pixels.text(self.coordinates(point), text, font=font.pixels, fill=fill, **kwargs)
