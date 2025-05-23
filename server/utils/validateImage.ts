import sharp from 'sharp';
import path from 'path';
import { IAppError } from '../../common/server.responses';
import { Response } from 'express';

export class ImageValidator {
  private constructor(private readonly imageMetadata: sharp.Metadata) {}

  public static async create(buffer: Buffer): Promise<ImageValidator> {
    const metadata = await sharp(buffer).metadata();
    return new ImageValidator(metadata);
  }

  private static readonly VALIDATION = {
    MAX_SIZE_KB: 1000,
    MIN_DIMENSION: 150,
    MAX_DIMENSION: 650,
    MAX_ASPECT_RATIO_DIFF: 100,
    VALID_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp', 'bmp'],
    BYTES_PER_KB: 1024,
  };

  public validate() {
    const { width, height, size } = this.imageMetadata;
    const validationResults = [
      this.validateMetadataPresence(this.imageMetadata),
      this.validateImageSize(size!),
      this.validateImageDimensions(width!, height!),
      this.validateAspectRatio(width!, height!),
      this.validateFileExtension(this.imageMetadata.format!)
    ];

    const error = validationResults.find((result) => result !== null);
    return error ?? null;
  }

  private validateFileExtension(format: string): string | null {
    const fileExtension = format;
    return !ImageValidator.VALIDATION.VALID_EXTENSIONS.includes(fileExtension)
      ? `Supported image formats are ${ImageValidator.VALIDATION.VALID_EXTENSIONS.join(', ')}`
      : null;
  }

  private validateMetadataPresence(metadata: sharp.Metadata): string | null {
    const { width, height, size } = metadata;
    return !width || !height || !size
      ? 'Unable to read image dimensions or size'
      : null;
  }

  private validateImageSize(size: number): string | null {
    return size > ImageValidator.VALIDATION.MAX_SIZE_KB * ImageValidator.VALIDATION.BYTES_PER_KB
      ? `Image size must not exceed ${ImageValidator.VALIDATION.MAX_SIZE_KB} KB`
      : null;
  }

  private validateImageDimensions(width: number, height: number): string | null {
    return width < ImageValidator.VALIDATION.MIN_DIMENSION ||
           height < ImageValidator.VALIDATION.MIN_DIMENSION ||
           width > ImageValidator.VALIDATION.MAX_DIMENSION ||
           height > ImageValidator.VALIDATION.MAX_DIMENSION
      ? `Image dimensions must be between ${ImageValidator.VALIDATION.MIN_DIMENSION}x${ImageValidator.VALIDATION.MIN_DIMENSION} and ${ImageValidator.VALIDATION.MAX_DIMENSION}x${ImageValidator.VALIDATION.MAX_DIMENSION} pixels`
      : null;
  }

  private validateAspectRatio(width: number, height: number): string | null {
    return Math.abs(width - height) > ImageValidator.VALIDATION.MAX_ASPECT_RATIO_DIFF
      ? `The difference between width and height must not exceed ${ImageValidator.VALIDATION.MAX_ASPECT_RATIO_DIFF} pixels`
      : null;
  }
}
