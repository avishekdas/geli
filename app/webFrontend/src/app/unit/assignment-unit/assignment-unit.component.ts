import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {UnitFormService} from "../../shared/services/unit-form.service";
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {IAssignmentUnit} from "../../../../../../shared/models/units/IAssignmentUnit";
import {UploadFormComponent} from "../../shared/components/upload-form/upload-form.component";
import {IFileUnit} from "../../../../../../shared/models/units/IFileUnit";
import {IFile} from '../../../../../../shared/models/IFile';
import {AssignmentService} from "../../shared/services/data.service";
import {UserService} from '../../shared/services/user.service';
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {SnackBarService} from '../../shared/services/snack-bar.service';
import {saveAs} from 'file-saver/FileSaver';

enum AssignmentIcon {
  TURNED_IN = 'assignment_turned_in',
  ACCEPTED = 'done',
  FAILED = 'clear',
}

@Component({
  selector: 'app-assignment-unit',
  templateUrl: './assignment-unit.component.html',
  styleUrls: ['./assignment-unit.component.scss']
})
export class AssignmentUnitComponent implements OnInit {
  @Input() assignmentUnit: IAssignmentUnit;
  @ViewChild(UploadFormComponent) public uploadForm: UploadFormComponent;

  allowedMimeTypes: string[];
  unitForm: FormGroup;
  uploadPath: string;
  assignmentIcon: AssignmentIcon;


  disableDownloadButton: boolean;

  public showUploadForm: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  data = this.showUploadForm.asObservable();

  files: IFile[] = [ ];

  selected: Number;

  constructor(public unitFormService: UnitFormService,
              public snackBar: SnackBarService,
              public formBuilder: FormBuilder,
              public userService: UserService,
              private assignmentService: AssignmentService) {
  }

  ngOnInit() {

    if (this.assignmentUnit.assignments.length) {

      this.files = this.assignmentUnit.assignments[0].files;

      if (this.assignmentUnit.assignments[0].checked === 1) {
        this.assignmentIcon = AssignmentIcon.ACCEPTED;
      } else if (this.assignmentUnit.assignments[0].checked === 0) {
        this.assignmentIcon = AssignmentIcon.FAILED;
      } else {
        this.assignmentIcon = AssignmentIcon.TURNED_IN;
      }
    }

    this.uploadPath = '/api/units/' + this.assignmentUnit._id + '/assignment/files';
    // this.allowedMimeTypes = ['text/plain'];

    this.unitFormService.unitInfoText = 'Assignments Info';
    this.unitFormService.headline = 'Assignments';

    this.unitForm = this.unitFormService.unitForm;

    this.unitForm.addControl('deadline', new FormControl(this.assignmentUnit.deadline));
    this.unitForm.addControl('assignments', new FormControl(this.assignmentUnit.assignments));

    console.log({assignmentUnit: this.assignmentUnit});

    if (this.assignmentUnit) {
      this.unitForm.patchValue({
        deadline: this.assignmentUnit.deadline,
        assignments: this.assignmentUnit.assignments
      });
    }

    this.disableDownloadButton = false;
  }


  public updateShowUploadForm = (shown: boolean) => {
    this.showUploadForm.next(shown);
  }

  /**
   *
   */
  public async startUpload() {
    if (!this.assignmentUnit.assignments.length) {
      // The user did not send any assignment. Create a new assignment
      await this.assignmentService.createAssignment(this.assignmentUnit._id);
    }

    try {
      this.uploadForm.fileUploader.uploadAll();
    } catch (error) {
    }
  }

  public onFileUploaded(event: IFileUnit) {
  }

  public onAllUploaded() {
    this.updateShowUploadForm(false);
  }

  public isObjectInQueue() {
    if (this.uploadForm) {
      return this.uploadForm.fileUploader.queue.length > 0;
    }
  }

  public isSubmitted() {
    if (!this.assignmentUnit.assignments.length) {
      return false;
    }
    return this.assignmentUnit.assignments[0].submitted;
  }

  public deleteAssignment() {
    this.updateShowUploadForm(true);
    this.assignmentService.deleteAssignment(this.assignmentUnit._id.toString());
  }

  public canBeDeleted() {
    if (this.assignmentUnit.assignments.length) {
      return true;
    } else {
      return false;
    }
  }

  public readyToBeGraded() {
    if (this.assignmentUnit.assignments.length) {
      if (this.assignmentUnit.assignments[0].submitted) {
        return true;
      }
    }
    return false;
  }

  public submitAssignment() {
    this.assignmentUnit.assignments[0].submitted = true;
    this.assignmentService.updateAssignment(this.assignmentUnit.assignments[0], this.assignmentUnit._id.toString());
  }

  public async downloadAllAssignments() {
    try {
      this.disableDownloadButton = true;
      const response = <Response> await this.assignmentService.downloadAllAssignments(this.assignmentUnit._id.toString());
      saveAs(response.body, this.assignmentUnit.name + '.zip');
      this.disableDownloadButton = false;
    } catch (err) {
      this.disableDownloadButton = false;
      this.snackBar.openLong('Woops! Something went wrong. Please try again in a few Minutes.');
    }
  }

  public submitStatusChange(unitId, approved) {
    const assignmentIndex = this.getElementIndexById(this.assignmentUnit.assignments, unitId);
    this.assignmentUnit.assignments[assignmentIndex].checked = approved;
    console.error(this.assignmentUnit.assignments[assignmentIndex]);
    this.assignmentService.updateAssignment(this.assignmentUnit.assignments[assignmentIndex], this.assignmentUnit._id.toString());
  }

  private getElementIndexById(arr, id) {
    return arr.findIndex((item) => {
      return item._id === id
    })
  }
}
